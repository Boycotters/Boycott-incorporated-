
DO $$
BEGIN
  -- Create policy for uploads
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Authenticated users can upload videos' AND tablename = 'objects') THEN
    CREATE POLICY "Authenticated users can upload videos"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'entertainment-videos');
  END IF;

  -- Create policy for public reads
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read access for entertainment videos' AND tablename = 'objects') THEN
    CREATE POLICY "Public read access for entertainment videos"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'entertainment-videos');
  END IF;

  -- Create policy for deletes
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can delete entertainment videos' AND tablename = 'objects') THEN
    CREATE POLICY "Admins can delete entertainment videos"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'entertainment-videos');
  END IF;
END $$;
