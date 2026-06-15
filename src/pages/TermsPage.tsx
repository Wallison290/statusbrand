export function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-[#0f0f0f] flex items-center justify-center">
          <span className="text-white font-bold text-sm">S</span>
        </div>
        <span className="font-semibold text-[#0f0f0f]" style={{ fontFamily: 'Georgia, serif' }}>
          StatusMedia
        </span>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl font-bold text-[#0f0f0f] mb-2">Termos de Serviço</h1>
        <p className="text-sm text-gray-400 mb-10">Última atualização: maio de 2025</p>

        <div className="prose prose-gray max-w-none space-y-8 text-[15px] leading-relaxed text-gray-700">

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar ou usar o StatusMedia, você concorda com estes Termos de Serviço. Se não concordar com qualquer parte destes termos, não utilize a plataforma. O uso continuado após alterações constitui aceite das novas condições.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">2. Descrição do Serviço</h2>
            <p>
              O StatusMedia é uma plataforma SaaS de gestão de redes sociais e marketing digital voltada para agências e profissionais. Oferecemos funcionalidades de agendamento de publicações, gestão de clientes, planejamento de conteúdo e integração com redes sociais como o Instagram.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">3. Conta de Usuário</h2>
            <p>Para usar o StatusMedia, você deve:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Ter pelo menos 18 anos de idade.</li>
              <li>Fornecer informações verdadeiras e atualizadas no cadastro.</li>
              <li>Manter a segurança de sua senha e não compartilhá-la.</li>
              <li>Notificar imediatamente qualquer uso não autorizado da conta.</li>
            </ul>
            <p className="mt-3">
              Você é responsável por todas as atividades realizadas em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">4. Uso Aceitável</h2>
            <p>Ao usar o StatusMedia, você concorda em não:</p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Publicar conteúdo ilegal, ofensivo, difamatório ou que viole direitos de terceiros.</li>
              <li>Usar a plataforma para enviar spam ou conteúdo não solicitado.</li>
              <li>Tentar acessar contas de outros usuários sem autorização.</li>
              <li>Usar a plataforma para violar as políticas das redes sociais integradas.</li>
              <li>Realizar engenharia reversa ou tentar extrair o código-fonte da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">5. Integração com Redes Sociais</h2>
            <p>
              Ao conectar contas de redes sociais (como o Instagram) ao StatusMedia, você:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Autoriza o StatusMedia a acessar e publicar conteúdo em seu nome, conforme as permissões concedidas.</li>
              <li>Confirma que possui os direitos necessários sobre o conteúdo publicado.</li>
              <li>Reconhece que a disponibilidade dessas integrações depende das políticas de cada plataforma.</li>
            </ul>
            <p className="mt-3">
              O StatusMedia opera em conformidade com as <a href="https://developers.facebook.com/policy/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Políticas da Plataforma Meta</a>.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">6. Planos e Pagamentos</h2>
            <p>
              O StatusMedia oferece planos pagos com cobrança recorrente. Ao assinar:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>A cobrança ocorre no início de cada período (mensal ou anual).</li>
              <li>Cancelamentos podem ser feitos a qualquer momento; o acesso continua até o final do período pago.</li>
              <li>Não realizamos reembolsos de períodos parciais.</li>
              <li>Preços podem ser alterados com aviso prévio de 30 dias.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">7. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo e funcionalidades do StatusMedia (exceto conteúdo gerado pelo usuário) são propriedade da StatusMedia e protegidos por leis de propriedade intelectual. O conteúdo que você publica por meio da plataforma permanece de sua propriedade.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">8. Disponibilidade do Serviço</h2>
            <p>
              Nos esforçamos para manter o StatusMedia disponível 24/7, mas não garantimos disponibilidade ininterrupta. Podemos realizar manutenções programadas e, em caso de instabilidade, avisaremos os usuários sempre que possível.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">9. Limitação de Responsabilidade</h2>
            <p>
              O StatusMedia não se responsabiliza por:
            </p>
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Falhas ou indisponibilidade das APIs de terceiros (Instagram, Meta, etc.).</li>
              <li>Perdas decorrentes de conteúdo não publicado por falhas de rede.</li>
              <li>Danos indiretos, incidentais ou consequentes decorrentes do uso da plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">10. Rescisão</h2>
            <p>
              Reservamo-nos o direito de suspender ou encerrar contas que violem estes Termos, sem aviso prévio em casos graves. Você pode encerrar sua conta a qualquer momento através das configurações da plataforma ou entrando em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">11. Lei Aplicável</h2>
            <p>
              Estes Termos são regidos pelas leis da República Federativa do Brasil. Qualquer disputa será resolvida perante o foro da comarca de domicílio do usuário, conforme a legislação vigente.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-[#0f0f0f] mb-3">12. Contato</h2>
            <p>
              Dúvidas sobre estes Termos de Serviço? Entre em contato:<br />
              <strong>StatusMedia</strong><br />
              E-mail: <a href="mailto:wallisonsilva290@gmail.com" className="text-blue-600 underline">wallisonsilva290@gmail.com</a>
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
