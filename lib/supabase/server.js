import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Cliente do Supabase para rodar no servidor (Server Components, layouts, rotas).
// Lê/escreve a sessão do usuário através dos cookies da requisição.
// A partir do Next.js 15, cookies() é assíncrono — por isso essa função também precisa ser
// assíncrona, e quem chamar precisa usar "await createClient()".
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // chamado a partir de um Server Component — o middleware cuida de renovar a sessão
          }
        },
      },
    }
  );
}
