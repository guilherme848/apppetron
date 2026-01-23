import { useState } from "react";
import { Download, Upload, ExternalLink, FileText } from "lucide-react";
import { ContractFile } from "@/types/contracts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useUploadSignedPdf } from "@/hooks/useContracts";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ContractFilesProps {
  contractId: string;
  files: ContractFile[];
  canUpload?: boolean;
}

export function ContractFiles({ contractId, files, canUpload }: ContractFilesProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const uploadMutation = useUploadSignedPdf();

  const handleDownload = async (file: ContractFile) => {
    try {
      const { data, error } = await supabase.storage
        .from("contracts")
        .download(file.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.file_name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading file:", error);
      toast.error("Erro ao baixar arquivo");
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;
    uploadMutation.mutate({ contractId, file: selectedFile }, {
      onSuccess: () => setSelectedFile(null),
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Arquivos</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {files.length === 0 && !canUpload ? (
          <p className="text-sm text-muted-foreground">Nenhum arquivo anexado.</p>
        ) : (
          <>
            {files.map((file) => (
              <div
                key={file.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">{file.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {file.file_type} • {file.file_size ? `${(file.file_size / 1024).toFixed(1)} KB` : ""}
                    </p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleDownload(file)}>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar
                </Button>
              </div>
            ))}

            {canUpload && (
              <div className="pt-4 border-t space-y-3">
                <p className="text-sm font-medium">Upload PDF Assinado (Fallback)</p>
                <div className="flex gap-2">
                  <Input
                    type="file"
                    accept=".pdf"
                    onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || uploadMutation.isPending}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Enviar
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
