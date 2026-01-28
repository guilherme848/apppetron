import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { cnpj } = await req.json();

    // Validate CNPJ - must be 14 digits
    const cleanCnpj = cnpj?.replace(/\D/g, '');
    if (!cleanCnpj || cleanCnpj.length !== 14) {
      return new Response(
        JSON.stringify({ error: 'CNPJ deve conter 14 dígitos' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Looking up CNPJ: ${cleanCnpj}`);

    // Try BrasilAPI first
    let address: AddressResult = {
      cep: null,
      state: null,
      city: null,
      neighborhood: null,
      street: null,
      complement: null,
    };

    try {
      const cnpjResponse = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cleanCnpj}`, {
        headers: { 'Accept': 'application/json' }
      });

      if (cnpjResponse.ok) {
        const cnpjData: CnpjResponse = await cnpjResponse.json();
        console.log('BrasilAPI CNPJ response:', JSON.stringify(cnpjData));

        // Extract address from CNPJ data
        if (cnpjData.cep) {
          address.cep = cnpjData.cep.replace(/\D/g, '');
        }
        if (cnpjData.uf) {
          address.state = cnpjData.uf;
        }
        if (cnpjData.municipio) {
          address.city = cnpjData.municipio;
        }
        if (cnpjData.bairro) {
          address.neighborhood = cnpjData.bairro;
        }
        if (cnpjData.logradouro) {
          address.street = cnpjData.logradouro;
        }
        if (cnpjData.complemento) {
          address.complement = cnpjData.complemento;
        }
      }
    } catch (cnpjError) {
      console.error('Error fetching from BrasilAPI CNPJ:', cnpjError);
    }

    // If we have a CEP but missing other data, try ViaCEP for more complete info
    if (address.cep && (!address.street || !address.neighborhood)) {
      try {
        const cepClean = address.cep.replace(/\D/g, '');
        const viaCepResponse = await fetch(`https://viacep.com.br/ws/${cepClean}/json/`);
        
        if (viaCepResponse.ok) {
          const viaCepData: ViaCepResponse = await viaCepResponse.json();
          console.log('ViaCEP response:', JSON.stringify(viaCepData));

          if (!viaCepData.erro) {
            // Only fill in missing fields
            if (!address.state && viaCepData.uf) {
              address.state = viaCepData.uf;
            }
            if (!address.city && viaCepData.localidade) {
              address.city = viaCepData.localidade;
            }
            if (!address.neighborhood && viaCepData.bairro) {
              address.neighborhood = viaCepData.bairro;
            }
            if (!address.street && viaCepData.logradouro) {
              address.street = viaCepData.logradouro;
            }
            if (!address.complement && viaCepData.complemento) {
              address.complement = viaCepData.complemento;
            }
          }
        }
      } catch (viaCepError) {
        console.error('Error fetching from ViaCEP:', viaCepError);
      }
    }

    // Format CEP with mask if present
    if (address.cep && address.cep.length === 8) {
      address.cep = `${address.cep.slice(0, 5)}-${address.cep.slice(5)}`;
    }

    console.log('Final address result:', JSON.stringify(address));

    // Check if we found any address data
    const hasAddressData = address.cep || address.state || address.city || 
                           address.neighborhood || address.street;

    if (!hasAddressData) {
      return new Response(
        JSON.stringify({ 
          error: 'Não foi possível localizar endereço para este CNPJ',
          address: null
        }),
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
