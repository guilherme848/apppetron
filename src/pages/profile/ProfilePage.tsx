import { useState, useRef, useEffect } from 'react';
import { User, Camera, Calendar, Briefcase } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MemberAvatar } from '@/components/common/MemberAvatar';
import { useTeamMembers } from '@/hooks/useTeamMembers';
import { useProfilePhoto } from '@/hooks/useProfilePhoto';
import { useCurrentMember } from '@/hooks/usePermissions';
import { toast } from 'sonner';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Skeleton } from '@/components/ui/skeleton';

export default function ProfilePage() {
  const { members, loading, updateMember, refetch } = useTeamMembers();
  const { currentMemberId } = useCurrentMember();
  const { uploadPhoto, uploading } = useProfilePhoto();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const currentMember = members.find(m => m.id === currentMemberId);
  
  const [fullName, setFullName] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [saving, setSaving] = useState<string | null>(null);
  
  useEffect(() => {
    if (currentMember) {
      setFullName(currentMember.full_name || currentMember.name || '');
      setBirthDate(currentMember.birth_date || '');
    }
  }, [currentMember]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    );
  }

  if (!currentMemberId || !currentMember) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <User className="h-6 w-6" />
            Meu Perfil
          </h1>
          <p className="text-muted-foreground">Selecione um usuário no seletor acima.</p>
        </div>
      </div>
    );
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentMember) return;
    
    const path = await uploadPhoto(currentMember.id, file);
    if (path) {
      const { error } = await updateMember(currentMember.id, { profile_photo_path: path });
      if (error) {
        toast.error('Erro ao salvar foto');
      } else {
        toast.success('Foto atualizada!');
        refetch();
      }
    }
  };

  const handleSaveField = async (field: 'full_name' | 'birth_date', value: string) => {
    if (!currentMember) return;
    
    setSaving(field);
    const updates: Record<string, string> = { [field]: value };
    
    if (field === 'full_name') {
      updates.name = value;
    }
    
    const willBeComplete = field === 'full_name' 
      ? (value && currentMember.birth_date)
      : (currentMember.full_name && value);
    
    if (willBeComplete && !currentMember.profile_completed_at) {
      updates.profile_completed_at = new Date().toISOString();
    }
    
    const { error } = await updateMember(currentMember.id, updates);
    if (error) {
      toast.error('Erro ao salvar');
    } else {
      toast.success('Salvo!');
    }
    setSaving(null);
  };

  const formattedAdmissionDate = currentMember.admission_date
    ? format(parseISO(currentMember.admission_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })
    : 'Não informada';

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <User className="h-6 w-6" />
          Meu Perfil
        </h1>
        <p className="text-muted-foreground">Gerencie suas informações pessoais.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Foto de Perfil</CardTitle>
          <CardDescription>Sua foto será exibida em todo o sistema.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-6">
          <div className="relative">
            <MemberAvatar
              name={currentMember.full_name || currentMember.name}
              photoPath={currentMember.profile_photo_path}
              size="xl"
            />
            <Button
              size="icon"
              variant="secondary"
              className="absolute bottom-0 right-0 rounded-full h-8 w-8"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              {uploading ? <Skeleton className="h-4 w-16 rounded" /> : <Camera className="h-4 w-4" />}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            <p>Clique no ícone para alterar sua foto.</p>
            <p>Formatos aceitos: JPG, PNG, WebP (máx. 2MB)</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações Pessoais</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="fullName">Nome Completo</Label>
            <div className="flex gap-2">
              <Input
                id="fullName"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                onBlur={() => {
                  if (fullName !== (currentMember.full_name || currentMember.name)) {
                    handleSaveField('full_name', fullName);
                  }
                }}
                placeholder="Seu nome completo"
              />
              {saving === 'full_name' && <Skeleton className="h-4 w-16 rounded" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthDate" className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Data de Nascimento
            </Label>
            <div className="flex gap-2">
              <Input
                id="birthDate"
                type="date"
                value={birthDate}
                onChange={(e) => setBirthDate(e.target.value)}
                onBlur={() => {
                  if (birthDate !== currentMember.birth_date) {
                    handleSaveField('birth_date', birthDate);
                  }
                }}
              />
              {saving === 'birth_date' && <Skeleton className="h-4 w-16 rounded" />}
            </div>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-muted-foreground">
              <Briefcase className="h-4 w-4" />
              Data de Admissão
            </Label>
            <p className="text-sm py-2 px-3 bg-muted rounded-md">{formattedAdmissionDate}</p>
            <p className="text-xs text-muted-foreground">Esta informação só pode ser alterada pelo administrador.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
