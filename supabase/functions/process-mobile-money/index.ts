import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/**
 * Mobile Money Processing Edge Function
 * 
 * This function handles mobile money withdrawals for Zambian providers:
 * - Airtel Money (with API integration)
 * - MTN Mobile Money
 * - Zamtel Kwacha
 */

interface WithdrawalRequest {
  withdrawal_id: string;
  provider: "airtel" | "mtn" | "zamtel";
  phone_number: string;
  amount_zmw: number;
}

interface AirtelTokenResponse {
  access_token: string;
  expires_in: number;
  token_type: string;
}

interface AirtelDisbursementResponse {
  data: {
    transaction: {
      id: string;
      status: string;
      message?: string;
    };
  };
  status: {
    code: string;
    message: string;
    result_code: string;
    success: boolean;
  };
}

// Cache for Airtel token
let airtelTokenCache: { token: string; expiresAt: number } | null = null;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { withdrawal_id, provider, phone_number, amount_zmw }: WithdrawalRequest = await req.json();

    console.log(`Processing withdrawal ${withdrawal_id} for ${provider} to ${phone_number}`);

    // Validate phone number format for each provider
    const phoneValidation = validatePhoneNumber(phone_number, provider);
    if (!phoneValidation.valid) {
      return new Response(
        JSON.stringify({ success: false, message: phoneValidation.message }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get withdrawal details
    const { data: withdrawal, error: withdrawalError } = await supabase
      .from("withdrawals")
      .select("*")
      .eq("id", withdrawal_id)
      .single();

    if (withdrawalError || !withdrawal) {
      return new Response(
        JSON.stringify({ success: false, message: "Withdrawal not found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 404 }
      );
    }

    if (withdrawal.status !== "pending") {
      return new Response(
        JSON.stringify({ success: false, message: "Withdrawal already processed" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Create mobile money transaction record
    const { data: mmTransaction, error: mmError } = await supabase
      .from("mobile_money_transactions")
      .insert({
        withdrawal_id,
        user_id: withdrawal.user_id,
        provider,
        phone_number,
        amount_zmw,
        status: "processing",
      })
      .select()
      .single();

    if (mmError) {
      console.error("Error creating mobile money transaction:", mmError);
      return new Response(
        JSON.stringify({ success: false, message: "Failed to create transaction" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
      );
    }

    // Process with the appropriate provider
    const result = await processWithProvider(provider, phone_number, amount_zmw, mmTransaction.id);

    // Update transaction status based on result
    await supabase
      .from("mobile_money_transactions")
      .update({
        status: result.success ? "completed" : "processing",
        external_transaction_id: result.transaction_id,
        provider_response: result.response,
        processed_at: new Date().toISOString(),
        completed_at: result.success ? new Date().toISOString() : null,
        error_message: result.error || null,
      })
      .eq("id", mmTransaction.id);

    // Update withdrawal status
    if (result.success) {
      await supabase
        .from("withdrawals")
        .update({
          status: "completed",
          processed_at: new Date().toISOString(),
          admin_notes: `Auto-processed via ${provider}. Txn: ${result.transaction_id}`,
        })
        .eq("id", withdrawal_id);
    }

    return new Response(
      JSON.stringify({
        success: result.success,
        message: result.success 
          ? "Withdrawal processed successfully" 
          : result.error || "Withdrawal submitted for processing (24-48 hours)",
        transaction_id: result.transaction_id,
        estimated_time: result.success ? "Instant" : "24-48 hours",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error processing mobile money:", error);
    return new Response(
      JSON.stringify({ success: false, message: "Internal server error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

function validatePhoneNumber(phone: string, provider: string): { valid: boolean; message?: string } {
  // Remove spaces and dashes
  const cleanPhone = phone.replace(/[\s-]/g, "");
  
  // Zambian phone number patterns
  const patterns: Record<string, RegExp> = {
    airtel: /^(0|260|\+260)?(97|77)\d{7}$/,  // 097x or 077x
    mtn: /^(0|260|\+260)?(96|76)\d{7}$/,      // 096x or 076x  
    zamtel: /^(0|260|\+260)?(95|55)\d{7}$/,   // 095x or 055x
  };

  const pattern = patterns[provider];
  if (!pattern) {
    return { valid: false, message: "Invalid provider" };
  }

  if (!pattern.test(cleanPhone)) {
    return { 
      valid: false, 
      message: `Invalid ${provider.toUpperCase()} phone number format` 
    };
  }

  return { valid: true };
}

function formatPhoneForAirtel(phone: string): string {
  // Remove all non-digits
  let cleaned = phone.replace(/\D/g, "");
  
  // Remove leading 0 or 260
  if (cleaned.startsWith("260")) {
    cleaned = cleaned.substring(3);
  } else if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }
  
  // Return with country code
  return `260${cleaned}`;
}

async function getAirtelAccessToken(): Promise<string | null> {
  // Check cache first
  if (airtelTokenCache && airtelTokenCache.expiresAt > Date.now()) {
    return airtelTokenCache.token;
  }

  const clientId = Deno.env.get("AIRTEL_CLIENT_ID");
  const clientSecret = Deno.env.get("AIRTEL_CLIENT_SECRET");

  if (!clientId || !clientSecret) {
    console.error("Airtel API credentials not configured");
    return null;
  }

  // Use production URL - change to openapiuat.airtel.africa for sandbox
  const baseUrl = "https://openapi.airtel.africa";

  try {
    const response = await fetch(`${baseUrl}/auth/oauth2/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        grant_type: "client_credentials",
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Airtel auth failed:", response.status, errorText);
      return null;
    }

    const data: AirtelTokenResponse = await response.json();
    
    // Cache the token (expires 1 minute before actual expiry)
    airtelTokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + (data.expires_in - 60) * 1000,
    };

    return data.access_token;
  } catch (error) {
    console.error("Error getting Airtel token:", error);
    return null;
  }
}

async function processAirtelDisbursement(
  phone: string,
  amount: number,
  transactionId: string
): Promise<{ success: boolean; transaction_id: string; response: any; error?: string }> {
  const accessToken = await getAirtelAccessToken();
  
  if (!accessToken) {
    return {
      success: false,
      transaction_id: `AIRTEL-PENDING-${transactionId}`,
      response: { status: "api_not_configured" },
      error: "Airtel API not configured. Transaction queued for manual processing.",
    };
  }

  const formattedPhone = formatPhoneForAirtel(phone);
  const baseUrl = "https://openapi.airtel.africa";
  const externalId = `CASH-${transactionId}-${Date.now()}`;

  try {
    const response = await fetch(`${baseUrl}/standard/v1/disbursements/`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "X-Country": "ZM",
        "X-Currency": "ZMW",
      },
      body: JSON.stringify({
        payee: {
          msisdn: formattedPhone,
        },
        reference: externalId,
        pin: Deno.env.get("AIRTEL_PIN") || "", // Encrypted PIN if required
        transaction: {
          amount: amount,
          id: externalId,
        },
      }),
    });

    const data: AirtelDisbursementResponse = await response.json();
    console.log("Airtel disbursement response:", JSON.stringify(data));

    if (data.status?.success || data.status?.code === "200") {
      return {
        success: true,
        transaction_id: data.data?.transaction?.id || externalId,
        response: data,
      };
    } else {
      return {
        success: false,
        transaction_id: externalId,
        response: data,
        error: data.status?.message || "Disbursement failed",
      };
    }
  } catch (error) {
    console.error("Airtel disbursement error:", error);
    return {
      success: false,
      transaction_id: `AIRTEL-ERROR-${transactionId}`,
      response: { error: error instanceof Error ? error.message : "Unknown error" },
      error: "Failed to process Airtel disbursement",
    };
  }
}

async function processWithProvider(
  provider: string, 
  phone: string, 
  amount: number,
  transactionId: string
): Promise<{ success: boolean; transaction_id: string; response: any; error?: string }> {
  console.log(`[${provider.toUpperCase()}] Processing ZMW ${amount} to ${phone}`);

  // Use Airtel API for Airtel Money
  if (provider === "airtel") {
    return await processAirtelDisbursement(phone, amount, transactionId);
  }

  // For MTN and Zamtel, queue for manual processing
  // TODO: Integrate MTN MoMo API (https://momodeveloper.mtn.com/)
  // TODO: Contact Zamtel for API access
  
  const mockTransactionId = `${provider.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    success: false,
    transaction_id: mockTransactionId,
    response: {
      status: "queued_for_manual_processing",
      message: "Transaction will be processed by admin within 24-48 hours",
      provider,
      phone,
      amount,
      created_at: new Date().toISOString(),
    },
  };
}