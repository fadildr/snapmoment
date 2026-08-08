import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// In v0, we can use anon key + public bucket, or service role key
// For this MVP let's assume SUPABASE_URL and SUPABASE_ANON_KEY are set
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const event_id = formData.get('event_id') as string;
    const guest_id = formData.get('guest_id') as string;
    const client_photo_id = formData.get('client_photo_id') as string;

    if (!file || !event_id || !client_photo_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!supabaseUrl || !supabaseKey) {
      // For local testing without Supabase setup, just simulate success
      console.log('No Supabase credentials. Simulating upload success for:', client_photo_id);
      return NextResponse.json({ 
        success: true, 
        storage_key: `simulated/${event_id}/${client_photo_id}.jpg`,
        simulated: true 
      });
    }

    // Prepare storage path: event_id/client_photo_id.jpg
    const storagePath = `${event_id}/${client_photo_id}.jpg`;

    const { data, error } = await supabase.storage
      .from('photos')
      .upload(storagePath, file, {
        cacheControl: '3600',
        upsert: true // Allow overwrite to avoid 'already exists' errors causing failures in retry loops
      });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, storage_key: data?.path });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
