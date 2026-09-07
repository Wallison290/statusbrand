// ── Página pública: Exclusão de dados ─────────────────────────────────────────
// Existe para atender dois campos obrigatórios do app na Meta:
//
//   • Data Deletion Instructions URL → https://statusmedia.com.br/data-deletion
//   • a URL de status devolvida pelo Data Deletion Request Callback, que a
//     Edge Function instagram-deauthorize responde como
//     https://statusmedia.com.br/data-deletion?code=<confirmation_code>
//
// Precisa abrir sem autenticação — o revisor da Meta acessa deslogado. O texto
// está em português e inglês pelo mesmo motivo.

import { useSearchParams } from 'react-router-dom'

const SUPPORT_EMAIL = 'wallisonsilva290@gmail.com'

export function DataDeletionPage() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('code')

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <picture>
          <source srcSet="/logo-icon.avif" type="image/avif" />
          <source srcSet="/logo-icon.webp" type="image/webp" />
          <img src="/logo-icon.png" alt="" width={32} height={32} className="w-8 h-8 object-contain" />
        </picture>
        <span className="font-semibold text-[#0f0f0f]">
          Status<span className="text-[#29457a]">Media</span>
        </span>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#0f0f0f] mb-2">Exclusão de dados</h1>
        <p className="text-sm text-gray-400 mb-10">Data deletion instructions</p>

        {/* Status de um pedido recebido pelo callback da Meta */}
        {code && (
          <div className="mb-10 rounded-xl border border-blue-200 bg-blue-50 px-5 py-4">
            <p className="text-[15px] text-[#0f0f0f] font-semibold">
              Pedido de exclusão recebido
            </p>
            <p className="text-[14px] text-gray-700 mt-1 leading-relaxed">
              Registramos sua solicitação e a conexão com o Instagram já foi desativada.
              A remoção dos dados é concluída em até 30 dias. Guarde o código abaixo para
              acompanhar o pedido por e-mail.
            </p>
            <p className="mt-3 text-[13px] text-gray-500">Código de confirmação</p>
            <p className="font-mono text-[15px] text-[#0f0f0f] break-all">{code}</p>
            <p className="text-[13px] text-gray-600 mt-3">
              <span className="italic">Deletion request received.</span> Your Instagram
              connection has already been revoked and the associated data is removed
              within 30 days. Keep this confirmation code to follow up.
            </p>
          </div>
        )}

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">Como pedir a exclusão dos seus dados</h2>
            <p>Você tem três caminhos, e pode usar qualquer um deles:</p>
            <ol className="list-decimal pl-5 mt-2 space-y-2">
              <li>
                <strong>Dentro do StatusMedia.</strong> Abra a seção Instagram, selecione a
                conta e clique em desconectar. O token de acesso é descartado na hora e
                deixamos de acessar qualquer dado daquela conta.
              </li>
              <li>
                <strong>Pelo Instagram.</strong> Em <em>Configurações → Aplicativos e sites</em>,
                remova o StatusMedia. A Meta nos avisa da remoção e desativamos a conexão
                automaticamente, sem que você precise fazer mais nada.
              </li>
              <li>
                <strong>Por e-mail.</strong> Escreva para{' '}
                <a href={`mailto:${SUPPORT_EMAIL}?subject=Pedido%20de%20exclus%C3%A3o%20de%20dados`} className="text-blue-600 underline">{SUPPORT_EMAIL}</a>{' '}
                com o assunto “Pedido de exclusão de dados”, informando o e-mail da sua
                conta no StatusMedia e o <em>@</em> da conta do Instagram. Confirmamos o
                recebimento e concluímos a exclusão em até 30 dias.
              </li>
            </ol>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">O que é apagado</h2>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>O token de acesso da conta do Instagram.</li>
              <li>Dados de perfil que armazenamos: identificador, nome de usuário, nome, foto e número de seguidores.</li>
              <li>Métricas coletadas da conta e das publicações para os relatórios.</li>
              <li>Publicações agendadas que ainda não foram ao ar.</li>
            </ul>
            <p className="mt-3">
              O conteúdo já publicado no Instagram pertence à sua conta e permanece lá —
              a exclusão aqui não apaga posts do seu perfil. Registros que a lei nos obriga
              a guardar (por exemplo, fiscais) são mantidos pelo prazo legal e não são
              usados para nenhuma outra finalidade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">Data deletion — English</h2>
            <p>
              To have your data deleted, you can (1) disconnect the account inside
              StatusMedia, under the Instagram section; (2) remove StatusMedia from{' '}
              <em>Instagram → Settings → Apps and websites</em>, which triggers our
              deauthorization callback and revokes the connection automatically; or
              (3) email{' '}
              <a href={`mailto:${SUPPORT_EMAIL}?subject=Data%20deletion%20request`} className="text-blue-600 underline">{SUPPORT_EMAIL}</a>{' '}
              with the subject “Data deletion request”, including your StatusMedia account
              email and the Instagram handle.
            </p>
            <p className="mt-3">
              We delete the access token, the stored profile data (id, username, name,
              profile picture, follower count), the collected account and media insights,
              and any scheduled posts that have not been published yet. Deletion is
              completed within 30 days. Content already published on Instagram belongs to
              your account and is not affected.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">Contato</h2>
            <p>
              <strong>StatusMedia</strong><br />
              E-mail: <a href={`mailto:${SUPPORT_EMAIL}`} className="text-blue-600 underline">{SUPPORT_EMAIL}</a><br />
              Política de privacidade: <a href="/privacy" className="text-blue-600 underline">statusmedia.com.br/privacy</a>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-gray-100 py-6 text-center text-sm text-gray-400">
        © {new Date().getFullYear()} StatusMedia. Todos os direitos reservados.
      </footer>
    </div>
  )
}
