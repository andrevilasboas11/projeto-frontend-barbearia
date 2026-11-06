const Auth = (function () {
  'use strict';

  const DURACAO_SESSAO_MS = 12 * 60 * 60 * 1000;

  const PAGINAS_PERMITIDAS = ['index.html', 'agendamento.html', 'minha-conta.html', 'pagamento.html'];

  function normalizarEmail(email) {
    return String(email).trim().toLowerCase();
  }

  function emailValido(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
  }

  async function gerarHash(email, senha) {
    const texto = email + ':' + senha;

    if (window.crypto && window.crypto.subtle) {
      const bytes = new TextEncoder().encode(texto);
      const resumo = await window.crypto.subtle.digest('SHA-256', bytes);
      return Array.from(new Uint8Array(resumo))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    }

    let h = 5381;
    for (let i = 0; i < texto.length; i++) {
      h = ((h << 5) + h + texto.charCodeAt(i)) | 0;
    }
    return 'simples-' + (h >>> 0).toString(16);
  }

  const validar = {
    nome(valor) {
      const nome = String(valor).trim();
      if (nome.length < 3) return 'Informe seu nome completo (mínimo 3 letras).';
      if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(nome)) return 'Use apenas letras no nome.';
      return '';
    },
    email(valor) {
      return emailValido(normalizarEmail(valor)) ? '' : 'Informe um e-mail válido, como nome@exemplo.com.';
    },
    senha(valor) {
      return String(valor).length >= 6 ? '' : 'A senha precisa ter pelo menos 6 caracteres.';
    },
  };

  function forcaSenha(senha) {
    if (!senha) return { porcentagem: 0, rotulo: '', classe: 'bg-secondary' };

    let pontos = 0;
    if (senha.length >= 8) pontos++;
    if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
    if (/\d/.test(senha)) pontos++;
    if (/[^A-Za-z0-9]/.test(senha)) pontos++;
    if (senha.length < 6) pontos = Math.min(pontos, 1);

    const niveis = [
      { porcentagem: 25, rotulo: 'Fraca', classe: 'bg-danger' },
      { porcentagem: 25, rotulo: 'Fraca', classe: 'bg-danger' },
      { porcentagem: 50, rotulo: 'Média', classe: 'bg-warning' },
      { porcentagem: 75, rotulo: 'Boa', classe: 'bg-info' },
      { porcentagem: 100, rotulo: 'Forte', classe: 'bg-success' },
    ];
    return niveis[pontos];
  }

  function iniciarSessao(email) {
    return Dados.sessao.definir({ email: email, expiraEm: Date.now() + DURACAO_SESSAO_MS });
  }

  function usuarioLogado() {
    const sessao = Dados.sessao.obter();
    if (!sessao || !sessao.email) return null;

    if (Date.now() > sessao.expiraEm) {
      Dados.sessao.limpar();
      return null;
    }

    const usuario = Dados.usuarios.listar().find((u) => u.email === sessao.email);
    if (!usuario) {
      Dados.sessao.limpar();
      return null;
    }
    return { nome: usuario.nome, email: usuario.email };
  }

  function sair() {
    Dados.sessao.limpar();
  }

  async function cadastrar(dados) {
    const nome = String(dados.nome).trim().replace(/\s+/g, ' ');
    const email = normalizarEmail(dados.email);
    const senha = String(dados.senha);

    const erroValidacao = validar.nome(nome) || validar.email(email) || validar.senha(senha);
    if (erroValidacao) return { ok: false, erro: erroValidacao };

    const usuarios = Dados.usuarios.listar();
    if (usuarios.some((u) => u.email === email)) {
      return { ok: false, erro: 'Já existe uma conta com este e-mail. Tente entrar.' };
    }

    usuarios.push({
      nome: nome,
      email: email,
      senhaHash: await gerarHash(email, senha),
      criadoEm: new Date().toISOString(),
    });

    if (!Dados.usuarios.salvar(usuarios) || !iniciarSessao(email)) {
      return { ok: false, erro: 'Não foi possível salvar os dados. Verifique se o navegador permite armazenamento local.' };
    }
    return { ok: true, usuario: { nome: nome, email: email } };
  }

  async function entrar(email, senha) {
    const emailNormalizado = normalizarEmail(email);
    const usuario = Dados.usuarios.listar().find((u) => u.email === emailNormalizado);
    const hash = await gerarHash(emailNormalizado, String(senha));

    if (!usuario || usuario.senhaHash !== hash) {
      return { ok: false, erro: 'E-mail ou senha incorretos.' };
    }

    if (!iniciarSessao(emailNormalizado)) {
      return { ok: false, erro: 'Não foi possível iniciar a sessão. Verifique se o navegador permite armazenamento local.' };
    }
    return { ok: true, usuario: { nome: usuario.nome, email: usuario.email } };
  }

  function exigirLogin() {
    const usuario = usuarioLogado();
    if (usuario) return usuario;

    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    const destino = paginaAtual + window.location.search;
    window.location.replace('login.html?next=' + encodeURIComponent(destino));
    return null;
  }

  function destinoSeguro(next) {
    if (!next) return 'index.html';
    const pagina = next.split('?')[0].split('#')[0];
    return PAGINAS_PERMITIDAS.includes(pagina) ? next : 'index.html';
  }

  function renderizarMenu() {
    const alvo = document.getElementById('menuUsuario');
    if (!alvo) return;

    alvo.replaceChildren();
    const caixa = document.createElement('div');
    caixa.className = 'menu-usuario';

    const usuario = usuarioLogado();
    if (usuario) {
      const saudacao = document.createElement('span');
      saudacao.className = 'menu-usuario__nome';
      saudacao.textContent = 'Olá, ' + usuario.nome.split(' ')[0];

      const botaoSair = document.createElement('button');
      botaoSair.type = 'button';
      botaoSair.className = 'btn btn-outline-barbearia btn-sm';
      botaoSair.textContent = 'Sair';
      botaoSair.addEventListener('click', function () {
        sair();
        window.location.href = 'index.html';
      });

      caixa.append(saudacao, botaoSair);
    } else {
      const link = document.createElement('a');
      link.className = 'btn btn-barbearia btn-sm';
      link.href = 'login.html';
      link.textContent = 'Entrar';
      caixa.append(link);
    }

    alvo.append(caixa);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderizarMenu);
  } else {
    renderizarMenu();
  }

  return {
    validar: validar,
    forcaSenha: forcaSenha,
    cadastrar: cadastrar,
    entrar: entrar,
    sair: sair,
    usuarioLogado: usuarioLogado,
    exigirLogin: exigirLogin,
    destinoSeguro: destinoSeguro,
    renderizarMenu: renderizarMenu,
  };
})();