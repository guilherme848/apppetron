import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera, Loader2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { useCurrentMember } from '@/hooks/usePermissions';
import { isProfileComplete } from '@/types/team';
import { toast } from 'sonner';

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { members, loading, updateMember, refetch } = useTeamMembers();
  const { currentMemberId } = useCurrentMember();
  const { uploadPhoto, uploading } = useProfilePhoto();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentMember = members.find(m => m.id === currentMemberId);
  
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    if (currentMember) {
      setFullName(currentMember.full_name || currentMember.name || '');
      setBirthDate(currentMember.birth_date || '');
      setPhotoPath(currentMember.profile_photo_path);
      
      // If profile is already complete, redirect to home
      if (isProfileComplete(currentMember)) {
        navigate('/');
      }
    }
  }, [currentMember, navigate]);

  // If no member selected (admin mode), redirect to home
  useEffect(() => {
    if (!loading && !currentMemberId) {
      navigate('/');
    }
  }, [loading, currentMemberId, navigate]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!currentMember) {
    return null;
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMember) return;
    
    const path = await uploadPhoto(currentMember.id, file);
    if (path) {
      setPhotoPath(path);
      await updateMember(currentMember.id, { profile_photo_path: path });
      toast.success('Foto enviada!');
    }
  };

  const handleSubmit = async () => {
    if (!fullName.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    if (!birthDate) {
      toast.error('Data de nascimento é obrigatória');
      return;
    }

    setSaving(true);
    const { error } = await updateMember(currentMember.id, {
      full_name: fullName.trim(),
      name: fullName.trim(),
      birth_date: birthDate,
      profile_photo_path: photoPath,
      profile_completed_at: new Date().toISOString(),
    });

    if (error) {
      toast.error('Erro ao salvar perfil');
      setSaving(false);
    } else {
      toast.success('Perfil completo!');
      await refetch();
      navigate('/');
    }
  };

  const isValid = fullName.trim() && birthDate;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <User className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl">Complete seu perfil</CardTitle>
          <CardDescription>
            Antes de continuar, precisamos de algumas informações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Photo Upload */}
          <div className="flex flex-col items-center gap-4">
            <div className="relative">
              <MemberAvatar
                name={fullName || currentMember.name}
                photoPath={photoPath}
                size="xl"
              />
              <Button
                size="icon"
                variant="secondary"
                className="absolute bottom-0 right-0 rounded-full h-8 w-8"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Camera className="h-4 w-4" />
                )}
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handlePhotoUpload}
              />
            </div>
            <p className="text-xs text-muted-foreground">Foto (opcional)</p>
          </div>

          {/* Full Name */}
          <div className="space-y-2">
            <Label htmlFor="setupFullName">Nome Completo *</Label>
            <Input
              id="setupFullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Seu nome completo"
            />
          </div>

          {/* Birth Date */}
          <div className="space-y-2">
            <Label htmlFor="setupBirthDate">Data de Nascimento *</Label>
            <Input
              id="setupBirthDate"
              type="date"
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
            />
          </div>

          <Button 
            className="w-full" 
            onClick={handleSubmit} 
            disabled={!isValid || saving}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Continuar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
