(function () {
  'use strict';

  const parametros = new URLSearchParams(window.location.search);
  const destino = Auth.destinoSeguro(parametros.get('next'));

  function mostrarErroCampo(campo, mensagem) {
    const caixaErro = document.getElementById(campo.id + '-erro');
    campo.classList.toggle('is-invalid', Boolean(mensagem));
    if (caixaErro) {
      caixaErro.textContent = mensagem;
      caixaErro.classList.toggle('d-block', Boolean(mensagem));
    }
    return !mensagem;
  }

  function mostrarAviso(elemento, tipo, texto) {
    elemento.className = 'alert alert-' + tipo;
    elemento.textContent = texto;
    elemento.hidden = false;
  }

  function limparErroAoDigitar(campo) {
    campo.addEventListener('input', function () {
      mostrarErroCampo(campo, '');
    });
  }

  const logado = Auth.usuarioLogado();
  if (logado) {
    document.getElementById('area-formularios').hidden = true;
    document.getElementById('area-ja-logado').hidden = false;
    document.getElementById('nome-logado').textContent = logado.nome;
    document.getElementById('link-continuar').href = destino;
    document.getElementById('btn-trocar-conta').addEventListener('click', function () {
      Auth.sair();
      window.location.reload();
    });
    return;
  }

  function configurarMostrarSenha(idBotao, idCampo) {
    const botao = document.getElementById(idBotao);
    const campo = document.getElementById(idCampo);

    botao.addEventListener('click', function () {
      const estavaVisivel = campo.type === 'text';
      campo.type = estavaVisivel ? 'password' : 'text';
      botao.textContent = estavaVisivel ? 'Mostrar' : 'Ocultar';
    });
  }

  configurarMostrarSenha('btn-mostrar-login', 'login-senha');
  configurarMostrarSenha('btn-mostrar-cadastro', 'cad-senha');

  const formLogin = document.getElementById('form-login');
  const loginEmail = document.getElementById('login-email');
  const loginSenha = document.getElementById('login-senha');
  const avisoLogin = document.getElementById('aviso-login');
  const botaoLogin = document.getElementById('btn-login');

  [loginEmail, loginSenha].forEach(limparErroAoDigitar);

  formLogin.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    avisoLogin.hidden = true;

    const emailOk = mostrarErroCampo(loginEmail, Auth.validar.email(loginEmail.value));
    const senhaOk = mostrarErroCampo(loginSenha, loginSenha.value ? '' : 'Informe sua senha.');
    if (!emailOk || !senhaOk) return;

    botaoLogin.disabled = true;
    const resultado = await Auth.entrar(loginEmail.value, loginSenha.value);

    if (!resultado.ok) {
      mostrarAviso(avisoLogin, 'danger', resultado.erro);
      botaoLogin.disabled = false;
      return;
    }

    mostrarAviso(avisoLogin, 'success', 'Login realizado! Redirecionando...');
    setTimeout(function () {
      window.location.href = destino;
    }, 700);
  });

  const formCadastro = document.getElementById('form-cadastro');
  const cadNome = document.getElementById('cad-nome');
  const cadEmail = document.getElementById('cad-email');
  const cadSenha = document.getElementById('cad-senha');
  const cadConfirmar = document.getElementById('cad-confirmar');
  const avisoCadastro = document.getElementById('aviso-cadastro');
  const botaoCadastro = document.getElementById('btn-cadastro');

  const barraForca = document.getElementById('barra-forca');
  const trilhoForca = document.getElementById('barra-forca-trilho');
  const textoForca = document.getElementById('cad-senha-forca');
  const DICA_SENHA = 'Use 8+ caracteres, com maiúsculas, números e símbolos.';

  [cadNome, cadEmail, cadSenha, cadConfirmar].forEach(limparErroAoDigitar);

  cadSenha.addEventListener('input', function () {
    const forca = Auth.forcaSenha(cadSenha.value);
    barraForca.className = 'progress-bar ' + forca.classe;
    barraForca.style.width = forca.porcentagem + '%';
    trilhoForca.setAttribute('aria-valuenow', String(forca.porcentagem));
    textoForca.textContent = forca.rotulo ? 'Força da senha: ' + forca.rotulo : DICA_SENHA;
  });

  formCadastro.addEventListener('submit', async function (evento) {
    evento.preventDefault();
    avisoCadastro.hidden = true;

    const nomeOk = mostrarErroCampo(cadNome, Auth.validar.nome(cadNome.value));
    const emailOk = mostrarErroCampo(cadEmail, Auth.validar.email(cadEmail.value));
    const senhaOk = mostrarErroCampo(cadSenha, Auth.validar.senha(cadSenha.value));
    const confirmarOk = mostrarErroCampo(
      cadConfirmar,
      cadConfirmar.value === cadSenha.value ? '' : 'As senhas não são iguais.'
    );
    if (!nomeOk || !emailOk || !senhaOk || !confirmarOk) return;

    botaoCadastro.disabled = true;
    const resultado = await Auth.cadastrar({
      nome: cadNome.value,
      email: cadEmail.value,
      senha: cadSenha.value,
    });

    if (!resultado.ok) {
      mostrarAviso(avisoCadastro, 'danger', resultado.erro);
      botaoCadastro.disabled = false;
      return;
    }

    mostrarAviso(avisoCadastro, 'success', 'Conta criada com sucesso! Redirecionando...');
    setTimeout(function () {
      window.location.href = destino;
    }, 900);
  });
})();