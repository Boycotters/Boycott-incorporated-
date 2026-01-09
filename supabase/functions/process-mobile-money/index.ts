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
 * - Airtel Money
 * - MTN Mobile Money
 * - Zamtel Kwacha
 * 
 * In production, you would integrate with actual mobile money APIs:
 * - Airtel: https://developers.airtel.africa/
 * - MTN: https://momodeveloper.mtn.com/
 * - Zamtel: Contact Zamtel for API access
 * 
 * Current implementation is a placeholder that marks transactions for manual processing
 */

interface WithdrawalRequest {
  withdrawal_id: string;
  provider: "airtel" | "mtn" | "zamtel";
  phone_number: string;
  amount_zmw: number;
}

// Conversion rate: 100 points = 1 ZMW (configurable)
const POINTS_TO_ZMW_RATE = 100;

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

    // In production, you would call the actual mobile money API here
    // For now, we simulate the process and mark for manual processing
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
        success: true,
        message: result.success 
          ? "Withdrawal processed successfully" 
          : "Withdrawal submitted for processing (24-48 hours)",
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
    airtel: /^(0|260)?(97|77)\d{7}$/,  // 097x or 077x
    mtn: /^(0|260)?(96|76)\d{7}$/,      // 096x or 076x  
    zamtel: /^(0|260)?(95|55)\d{7}$/,   // 095x or 055x
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

async function processWithProvider(
  provider: string, 
  phone: string, 
  amount: number,
  transactionId: string
): Promise<{ success: boolean; transaction_id: string; response: any }> {
  // Placeholder for actual API integration
  // In production, replace with actual mobile money API calls
  
  console.log(`[${provider.toUpperCase()}] Processing ZMW ${amount} to ${phone}`);
  
  // Simulate API response
  // For actual integration:
  // - Airtel: Use Airtel Africa API (https://developers.airtel.africa/)
  // - MTN: Use MTN MoMo API (https://momodeveloper.mtn.com/)
  // - Zamtel: Contact Zamtel directly for API access

  const mockTransactionId = `${provider.toUpperCase()}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  // Return processing status (manual processing required for now)
  return {
    success: false, // Set to true when actual API integration is complete
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
