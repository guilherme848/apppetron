import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CnpjResponse {
  cep?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
}

interface ViaCepResponse {
  cep?: string;
  logradouro?: string;
  complemento?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
}

interface AddressResult {
  cep: string | null;
  state: string | null;
  city: string | null;
  neighborhood: string | null;
  street: string | null;
  complement: string | null;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // --- Authentication check ---
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(
        JSON.stringify({ error: 'Não autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    // --- End authentication check ---

    const { cnpj } = await req.json();

    const cleanCnpj = cnpj?.replace(/\D/g, '');
    if (!cleanCnpj || cleanCnpj.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CNPJ deve conter 14 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up CNPJ: ${cleanCnpj}`);

    let address: AddressResult = {
      cep: null, state: null, city: null,
      neighborhood: null, street: null, complement: null,
    };

    try {
      const cnpjResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (cnpjResponse.ok) {
        const cnpjData: CnpjResponse = await cnpjResponse.json();
        if (cnpjData.cep) address.cep = cnpjData.cep.replace(/\D/g, '');
        if (cnpjData.uf) address.state = cnpjData.uf;
        if (cnpjData.municipio) address.city = cnpjData.municipio;
        if (cnpjData.bairro) address.neighborhood = cnpjData.bairro;
        if (cnpjData.logradouro) address.street = cnpjData.logradouro;
        if (cnpjData.complemento) address.complement = cnpjData.complemento;
      }
    } catch (cnpjError) {
      console.error('Error fetching from BrasilAPI CNPJ:', cnpjError);
    }

    if (address.cep && (!address.street || !address.neighborhood)) {
      try {
        const cepClean = address.cep.replace(/\D/g, '');
        const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
        
        if (viaCepResponse.ok) {
          const viaCepData: ViaCepResponse = await viaCepResponse.json();
          if (!viaCepData.erro) {
            if (!address.state && viaCepData.uf) address.state = viaCepData.uf;
            if (!address.city && viaCepData.localidade) address.city = viaCepData.localidade;
            if (!address.neighborhood && viaCepData.bairro) address.neighborhood = viaCepData.bairro;
            if (!address.street && viaCepData.logradouro) address.street = viaCepData.logradouro;
            if (!address.complement && viaCepData.complemento) address.complement = viaCepData.complemento;
          }
        }
      } catch (viaCepError) {
        console.error('Error fetching from ViaCEP:', viaCepError);
      }
    }

    if (address.cep && address.cep.length === 8) {
      address.cep = `${address.cep.slice(0, 5)}-${address.cep.slice(5)}`;
    }

    const hasAddressData = address.cep || address.state || address.city || 
                            address.neighborhood || address.street;

    if (!hasAddressData) {
      return new Response(
        JSON.stringify({ error: 'Não foi possível localizar endereço para este CNPJ', address: null }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ address }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in lookup-cnpj-address:', error);
    return new Response(
      JSON.stringify({ error: 'Erro interno ao buscar endereço' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
