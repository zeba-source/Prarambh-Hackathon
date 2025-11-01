-- Create reports table
CREATE TABLE public.reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  image_url text NOT NULL,
  ai_processed_image_url text,
  description text NOT NULL,
  latitude decimal(10, 8) NOT NULL,
  longitude decimal(11, 8) NOT NULL,
  category text NOT NULL CHECK (category IN ('pothole', 'garbage', 'streetlight', 'other')),
  department text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in-progress', 'resolved')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create policies - allow everyone to view reports
CREATE POLICY "Anyone can view reports"
ON public.reports
FOR SELECT
USING (true);

-- Allow anyone to create reports (for now, since no auth is implemented yet)
CREATE POLICY "Anyone can create reports"
ON public.reports
FOR INSERT
WITH CHECK (true);

-- Allow anyone to update reports (admins can update status)
CREATE POLICY "Anyone can update reports"
ON public.reports
FOR UPDATE
USING (true);

-- Create storage bucket for report images
INSERT INTO storage.buckets (id, name, public)
VALUES ('report-images', 'report-images', true);

-- Storage policies for report images
CREATE POLICY "Anyone can view report images"
ON storage.objects
FOR SELECT
USING (bucket_id = 'report-images');

CREATE POLICY "Anyone can upload report images"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'report-images');

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_reports_updated_at
BEFORE UPDATE ON public.reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for reports table
ALTER PUBLICATION supabase_realtime ADD TABLE public.reports;