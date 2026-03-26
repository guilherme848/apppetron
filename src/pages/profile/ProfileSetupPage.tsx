import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { isProfileComplete } from '@/types/team';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfileSetupPage() {
  const navigate = useNavigate();
  const { member, loading: authLoading, refreshMember, signOut } = useAuth();
  const { uploadPhoto, uploading } = useProfilePhoto();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const currentMember = member;
  
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
        navigate('/', { replace: true });
      }
    }
  }, [currentMember, navigate]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!currentMember) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-semibold text-foreground">Acesso pendente</h1>
          <p className="text-muted-foreground">
            Sua conta ainda não foi vinculada a um perfil de membro da equipe.
            Peça ao administrador para concluir o vínculo.
          </p>
          <Button variant="outline" onClick={signOut}>Sair</Button>
        </div>
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMember) return;
    
    const path = await uploadPhoto(currentMember.id, file);
    if (path) {
      setPhotoPath(path);
      const { error } = await supabase
        .from('team_members')
        .update({ profile_photo_path: path })
        .eq('id', currentMember.id);

      if (error) {
        toast.error('Erro ao salvar foto');
        return;
      }

      await refreshMember();
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
    const { error } = await supabase
      .from('team_members')
      .update({
        full_name: fullName.trim(),
        name: fullName.trim(),
        birth_date: birthDate,
        profile_photo_path: photoPath,
        profile_completed_at: new Date().toISOString(),
      })
      .eq('id', currentMember.id);

    if (error) {
      toast.error('Erro ao salvar perfil');
      setSaving(false);
    } else {
      toast.success('Perfil completo!');
      await refreshMember();
      navigate('/', { replace: true });
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
                  <Skeleton className="h-4 w-16 rounded" />
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
              <Skeleton className="h-4 w-16 rounded" />
            ) : null}
            Continuar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
