import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const BUCKET_NAME = 'profile-photos';
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function useProfilePhoto() {
  const [uploading, setUploading] = useState(false);

  const uploadPhoto = async (memberId: string, file: File): Promise<string | null> => {
    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error('Formato inválido. Use JPG, PNG ou WebP.');
      return null;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast.error('Arquivo muito grande. Máximo 2MB.');
      return null;
    }

    setUploading(true);
    try {
      // Generate unique file path
      const fileExt = file.name.split('.').pop();
      const fileName = `${memberId}/${Date.now()}.${fileExt}`;

      // Delete old photos for this member first
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(memberId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${memberId}/${f.name}`);
        await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
      }

      // Upload new photo
      const { error: uploadError } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) {
        console.error('Upload error:', uploadError);
        toast.error('Erro ao fazer upload da foto.');
        return null;
      }

      return fileName;
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Erro ao fazer upload da foto.');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const deletePhoto = async (memberId: string): Promise<boolean> => {
    setUploading(true);
    try {
      const { data: existingFiles } = await supabase.storage
        .from(BUCKET_NAME)
        .list(memberId);

      if (existingFiles && existingFiles.length > 0) {
        const filesToDelete = existingFiles.map(f => `${memberId}/${f.name}`);
        await supabase.storage.from(BUCKET_NAME).remove(filesToDelete);
      }
      
      return true;
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Erro ao remover a foto.');
      return false;
    } finally {
      setUploading(false);
    }
  };

  const getPhotoUrl = (path: string | null): string | null => {
    if (!path) return null;
    return `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${path}`;
  };

  return {
    uploadPhoto,
    deletePhoto,
    getPhotoUrl,
    uploading,
  };
}
