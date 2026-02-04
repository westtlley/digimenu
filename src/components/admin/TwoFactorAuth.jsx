import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Shield, Smartphone, Key, CheckCircle, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
// Importação dinâmica do qrcode (backend)
// No frontend, usamos qrcode.react que já está instalado

/**
 * TwoFactorAuth - Autenticação de dois fatores (2FA)
 * Funcionalidades:
 * - Gerar código QR para app autenticador
 * - Ativar/desativar 2FA
 * - Códigos de backup
 * - Verificação de código
 */
export default function TwoFactorAuth({ user }) {
  const queryClient = useQueryClient();
  const [verificationCode, setVerificationCode] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState(null);
  const [backupCodes, setBackupCodes] = useState([]);

  const { data: user2FA } = useQuery({
    queryKey: ['user2FA', user?.email],
    queryFn: async () => {
      try {
        return await base44.entities.User2FA.filter({ user_email: user?.email });
      } catch {
        return [];
      }
    },
    enabled: !!user?.email,
  });

  const is2FAEnabled = user2FA?.[0]?.enabled || false;

  // Funções auxiliares (simuladas - em produção usar biblioteca real)
  const generateSecret = () => {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
      .toUpperCase();
  };

  const verifyTOTP = (code, secret) => {
    // Em produção, usar biblioteca como 'otplib' ou 'speakeasy'
    // Por enquanto, aceita qualquer código de 6 dígitos para demonstração
    return /^\d{6}$/.test(code);
  };

  // Gerar QR Code para 2FA
  const generateQRCodeMutation = useMutation({
    mutationFn: async () => {
      // Gerar secret usando biblioteca TOTP (simulado)
      const secret = generateSecret();
      const issuer = 'DigiMenu';
      const accountName = user?.email || 'user';
      const otpAuthUrl = `otpauth://totp/${issuer}:${accountName}?secret=${secret}&issuer=${issuer}`;

      // Gerar QR Code usando API do backend ou biblioteca frontend
      // Por enquanto, vamos usar uma URL de API que gera o QR code
      const qrCodeApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
      setQrCodeUrl(qrCodeApiUrl);

      // Salvar secret temporariamente (em produção, usar biblioteca segura)
      localStorage.setItem('temp_2fa_secret', secret);

      // Gerar códigos de backup
      const codes = Array.from({ length: 10 }, () => 
        Math.random().toString(36).substring(2, 8).toUpperCase()
      );
      setBackupCodes(codes);

      return { secret, qrCodeDataUrl: qrCodeApiUrl, backupCodes: codes };
    },
    onError: (error) => {
      toast.error('Erro ao gerar QR Code: ' + error.message);
    }
  });

  // Ativar 2FA
  const enable2FAMutation = useMutation({
    mutationFn: async ({ code }) => {
      const secret = localStorage.getItem('temp_2fa_secret');
      if (!secret) throw new Error('Secret não encontrado');

      // Verificar código (em produção, usar biblioteca TOTP)
      const isValid = verifyTOTP(code, secret);
      if (!isValid) {
        throw new Error('Código inválido');
      }

      // Salvar configuração 2FA
      await base44.entities.User2FA.create({
        user_email: user.email,
        secret: secret, // Em produção, criptografar
        enabled: true,
        backup_codes: backupCodes,
        created_at: new Date().toISOString(),
      });

      localStorage.removeItem('temp_2fa_secret');
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user2FA']);
      toast.success('2FA ativado com sucesso!');
      setQrCodeUrl(null);
      setVerificationCode('');
    },
    onError: (error) => {
      toast.error('Erro ao ativar 2FA: ' + error.message);
    }
  });

  // Desativar 2FA
  const disable2FAMutation = useMutation({
    mutationFn: async () => {
      if (user2FA?.[0]?.id) {
        await base44.entities.User2FA.update(user2FA[0].id, {
          enabled: false,
        });
      }
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['user2FA']);
      toast.success('2FA desativado');
    },
    onError: (error) => {
      toast.error('Erro ao desativar 2FA: ' + error.message);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6" />
            Autenticação de Dois Fatores (2FA)
          </h2>
          <p className="text-gray-500">Proteja sua conta com 2FA</p>
        </div>
      </div>

      {/* Status atual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Status da Segurança</span>
            <Badge variant={is2FAEnabled ? 'default' : 'secondary'}>
              {is2FAEnabled ? (
                <>
                  <CheckCircle className="w-4 h-4 mr-1" />
                  Ativo
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-1" />
                  Inativo
                </>
              )}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!is2FAEnabled ? (
            <>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-semibold text-blue-900 mb-2">O que é 2FA?</h3>
                <p className="text-sm text-blue-800">
                  A autenticação de dois fatores adiciona uma camada extra de segurança. 
                  Além da senha, você precisará de um código do aplicativo autenticador.
                </p>
              </div>

              <Button
                onClick={() => generateQRCodeMutation.mutate()}
                disabled={generateQRCodeMutation.isLoading}
                className="w-full"
              >
                <Smartphone className="w-4 h-4 mr-2" />
                Ativar 2FA
              </Button>

              {/* QR Code */}
              {qrCodeUrl && (
                <div className="space-y-4 p-4 border rounded-lg">
                  <div>
                    <Label>1. Escaneie o QR Code com seu app autenticador</Label>
                    <div className="mt-2 flex justify-center">
                      <img src={qrCodeUrl} alt="QR Code 2FA" className="border rounded" />
                    </div>
                  </div>

                  <div>
                    <Label>2. Digite o código de 6 dígitos do app</Label>
                    <div className="flex gap-2 mt-2">
                      <Input
                        type="text"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center text-2xl tracking-widest"
                      />
                      <Button
                        onClick={() => enable2FAMutation.mutate({ code: verificationCode })}
                        disabled={verificationCode.length !== 6 || enable2FAMutation.isLoading}
                      >
                        Verificar
                      </Button>
                    </div>
                  </div>

                  {/* Códigos de backup */}
                  {backupCodes.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <Label className="text-yellow-900 font-semibold">
                        ⚠️ Códigos de Backup (guarde em local seguro)
                      </Label>
                      <div className="grid grid-cols-2 gap-2 mt-2">
                        {backupCodes.map((code, index) => (
                          <code key={index} className="text-sm bg-white p-2 rounded border">
                            {code}
                          </code>
                        ))}
                      </div>
                      <p className="text-xs text-yellow-800 mt-2">
                        Use estes códigos se perder acesso ao app autenticador
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-900 mb-2">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-semibold">2FA está ativo</span>
                </div>
                <p className="text-sm text-green-800">
                  Sua conta está protegida com autenticação de dois fatores.
                </p>
              </div>

              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm('Tem certeza que deseja desativar o 2FA? Isso reduzirá a segurança da sua conta.')) {
                    disable2FAMutation.mutate();
                  }
                }}
                disabled={disable2FAMutation.isLoading}
                className="w-full"
              >
                Desativar 2FA
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Instruções */}
      <Card>
        <CardHeader>
          <CardTitle>Apps Autenticadores Recomendados</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <p>• <strong>Google Authenticator</strong> (iOS/Android)</p>
            <p>• <strong>Microsoft Authenticator</strong> (iOS/Android)</p>
            <p>• <strong>Authy</strong> (iOS/Android/Desktop)</p>
            <p>• <strong>1Password</strong> (iOS/Android/Desktop)</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
