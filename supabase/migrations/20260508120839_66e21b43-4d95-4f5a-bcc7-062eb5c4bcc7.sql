
-- Trigger: notify sender when a transfer is created
CREATE OR REPLACE FUNCTION public.notify_point_transfer_created()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notification_queue (user_id, title, body, data, status)
  VALUES (
    NEW.sender_id,
    'Transfer submitted ⏳',
    'You sent ' || NEW.amount || ' pts (code ' || NEW.verification_code || '). Awaiting admin approval.',
    jsonb_build_object('type','transfer_created','transfer_id',NEW.id,'amount',NEW.amount),
    'pending'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_point_transfer_created ON public.point_transfers;
CREATE TRIGGER trg_notify_point_transfer_created
AFTER INSERT ON public.point_transfers
FOR EACH ROW EXECUTE FUNCTION public.notify_point_transfer_created();

-- Trigger: notify both parties on status change
CREATE OR REPLACE FUNCTION public.notify_point_transfer_reviewed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = OLD.status THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'approved' THEN
    INSERT INTO public.notification_queue (user_id, title, body, data, status)
    VALUES (
      NEW.recipient_id,
      'Points received 🎉',
      'You received ' || NEW.amount || ' pts from a transfer. Check your wallet!',
      jsonb_build_object('type','transfer_received','transfer_id',NEW.id,'amount',NEW.amount),
      'pending'
    );
    INSERT INTO public.notification_queue (user_id, title, body, data, status)
    VALUES (
      NEW.sender_id,
      'Transfer approved ✅',
      'Your transfer of ' || NEW.amount || ' pts was approved and delivered.',
      jsonb_build_object('type','transfer_approved','transfer_id',NEW.id,'amount',NEW.amount),
      'pending'
    );
  ELSIF NEW.status = 'rejected' THEN
    INSERT INTO public.notification_queue (user_id, title, body, data, status)
    VALUES (
      NEW.sender_id,
      'Transfer rejected ❌',
      COALESCE('Your transfer was rejected. ' || NEW.admin_notes, 'Your transfer was rejected. Points refunded.'),
      jsonb_build_object('type','transfer_rejected','transfer_id',NEW.id,'amount',NEW.amount),
      'pending'
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_point_transfer_reviewed ON public.point_transfers;
CREATE TRIGGER trg_notify_point_transfer_reviewed
AFTER UPDATE ON public.point_transfers
FOR EACH ROW EXECUTE FUNCTION public.notify_point_transfer_reviewed();

-- Enable realtime for relevant tables (ignore if already added)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notification_queue;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_generated_videos;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.ai_usage_logs;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.daily_activity_limits;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.point_transfers;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.notification_queue REPLICA IDENTITY FULL;
ALTER TABLE public.ai_generated_videos REPLICA IDENTITY FULL;
ALTER TABLE public.ai_usage_logs REPLICA IDENTITY FULL;
ALTER TABLE public.daily_activity_limits REPLICA IDENTITY FULL;
ALTER TABLE public.point_transfers REPLICA IDENTITY FULL;
