(function () {
  'use strict';

  const { criar, formatarData, formatarDataHora, formatarPreco, momento, valorSelecionado, mostrarErro, descreverPagamento } = Util;

  const ESPERA_MS = 1800;
  const MAXIMO_PARCELAS = 3;

  const usuario = Auth.exigirLogin();
  if (!usuario) return;

  const idDoAgendamento = new URLSearchParams(window.location.search).get('id');
  const referencia = 'PB-' + Math.random().toString(36).slice(2, 8).toUpperCase();

  function buscarAgendamento() {
    const lista = Dados.agendamentos.listar();
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].id === idDoAgendamento && lista[i].usuario === usuario.email) return lista[i];
    }
    return null;
  }

  let agendamento = buscarAgendamento();
  let cupom = { codigo: '', desconto: 0 };

  const form = document.getElementById('form-pagamento');
  const botaoPagar = document.getElementById('btn-pagar');
  const avisoPagamento = document.getElementById('aviso-pagamento');

  function mostrarSo(idDaArea) {
    const areas = ['area-indisponivel', 'area-pagamento', 'area-comprovante'];
    for (let i = 0; i < areas.length; i++) {
      document.getElementById(areas[i]).hidden = areas[i] !== idDaArea;
    }
  }

  function mostrarIndisponivel(texto) {
    document.getElementById('msg-indisponivel').textContent = texto;
    mostrarSo('area-indisponivel');
  }

  function mostrarAviso(tipo, texto) {
    avisoPagamento.className = 'alert alert-' + tipo;
    avisoPagamento.textContent = texto;
    avisoPagamento.hidden = false;
  }

  function arredondar(valor) {
    return Math.round(valor * 100) / 100;
  }

  function totalAPagar() {
    return arredondar(agendamento.valor - cupom.desconto);
  }

  function usuarioJaPagou() {
    const lista = Dados.agendamentos.listar();
    for (let i = 0; i < lista.length; i++) {
      const pagamento = lista[i].pagamento;
      if (lista[i].usuario === usuario.email && pagamento && pagamento.pagoEm) return true;
    }
    return false;
  }

  function calcularCupom(codigo, subtotal) {
    switch (codigo) {
      case 'PRIMEIRA10':
        if (usuarioJaPagou()) {
          return { valido: false, mensagem: 'O cupom PRIMEIRA10 vale só para o primeiro pagamento.' };
        }
        return { valido: true, desconto: arredondar(subtotal * 0.1), mensagem: '10% de desconto aplicado.' };
      case 'BARBER5':
        return { valido: true, desconto: Math.min(5, subtotal), mensagem: 'R$ 5,00 de desconto aplicado.' };
      case 'VIP20':
        return { valido: true, desconto: arredondar(subtotal * 0.2), mensagem: '20% de desconto aplicado.' };
      default:
        return { valido: false, mensagem: 'Cupom inválido.' };
    }
  }

  function mostrarMensagemCupom(ok, texto) {
    const mensagem = document.getElementById('cupom-msg');
    mensagem.textContent = texto;
    mensagem.className = 'cupom-msg ' + (ok ? 'cupom-msg--ok' : 'cupom-msg--erro');
  }

  function aplicarCupom() {
    const codigo = document.getElementById('cupom').value.trim().toUpperCase();

    if (!codigo) {
      mostrarMensagemCupom(false, 'Digite um cupom.');
      return;
    }

    const resultado = calcularCupom(codigo, agendamento.valor);
    cupom = resultado.valido ? { codigo: codigo, desconto: resultado.desconto } : { codigo: '', desconto: 0 };
    mostrarMensagemCupom(resultado.valido, resultado.mensagem);
    atualizarTotais();
  }

  document.getElementById('btn-cupom').addEventListener('click', aplicarCupom);
  document.getElementById('cupom').addEventListener('keydown', function (evento) {
    if (evento.key === 'Enter') {
      evento.preventDefault();
      aplicarCupom();
    }
  });

  function desenharQr(canvas, semente) {
    const MODULOS = 25;
    const TAMANHO = 7;
    const contexto = canvas.getContext('2d');
    canvas.width = MODULOS * TAMANHO;
    canvas.height = MODULOS * TAMANHO;

    contexto.fillStyle = '#ffffff';
    contexto.fillRect(0, 0, canvas.width, canvas.height);
    contexto.fillStyle = '#141a26';

    let estado = 0;
    for (let i = 0; i < semente.length; i++) {
      estado = (estado * 31 + semente.charCodeAt(i)) >>> 0;
    }
    function proximo() {
      estado = (estado * 1664525 + 1013904223) >>> 0;
      return estado / 4294967296;
    }

    function ehCanto(x, y) {
      return (x < 8 && y < 8) || (x >= MODULOS - 8 && y < 8) || (x < 8 && y >= MODULOS - 8);
    }

    for (let y = 0; y < MODULOS; y++) {
      for (let x = 0; x < MODULOS; x++) {
        if (!ehCanto(x, y) && proximo() > 0.5) {
          contexto.fillRect(x * TAMANHO, y * TAMANHO, TAMANHO, TAMANHO);
        }
      }
    }

    const cantos = [[0, 0], [MODULOS - 7, 0], [0, MODULOS - 7]];
    for (let i = 0; i < cantos.length; i++) {
      const cx = cantos[i][0] * TAMANHO;
      const cy = cantos[i][1] * TAMANHO;
      contexto.fillStyle = '#141a26';
      contexto.fillRect(cx, cy, 7 * TAMANHO, 7 * TAMANHO);
      contexto.fillStyle = '#ffffff';
      contexto.fillRect(cx + TAMANHO, cy + TAMANHO, 5 * TAMANHO, 5 * TAMANHO);
      contexto.fillStyle = '#141a26';
      contexto.fillRect(cx + 2 * TAMANHO, cy + 2 * TAMANHO, 3 * TAMANHO, 3 * TAMANHO);
    }
  }

  function atualizarPix() {
    const centavos = String(Math.round(totalAPagar() * 100)).padStart(6, '0');
    const codigo = 'SIMULADO-00020126-PROJETOBARBER-' + referencia + '-' + centavos;

    document.getElementById('pix-codigo').value = codigo;
    document.getElementById('pix-valor').textContent = formatarPreco(totalAPagar());
    desenharQr(document.getElementById('pix-qr'), codigo);
  }

  document.getElementById('btn-copiar-pix').addEventListener('click', function () {
    const campo = document.getElementById('pix-codigo');
    const aviso = document.getElementById('pix-copiado');

    function confirmarCopia() {
      aviso.hidden = false;
      setTimeout(function () {
        aviso.hidden = true;
      }, 2000);
    }

    function copiarPorSelecao() {
      campo.select();
      try {
        document.execCommand('copy');
        confirmarCopia();
      } catch (erro) {
      }
    }

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(campo.value).then(confirmarCopia, copiarPorSelecao);
    } else {
      copiarPorSelecao();
    }
  });

  function bandeiraDoCartao(digitos) {
    switch (digitos.charAt(0)) {
      case '4':
        return 'Visa';
      case '5':
        return 'Mastercard';
      case '3':
        return 'Amex';
      default:
        return 'Cartão';
    }
  }

  function luhnValido(digitos) {
    if (digitos.length < 13) return false;

    let soma = 0;
    let dobrar = false;
    for (let i = digitos.length - 1; i >= 0; i--) {
      let numero = Number(digitos.charAt(i));
      if (dobrar) {
        numero *= 2;
        if (numero > 9) numero -= 9;
      }
      soma += numero;
      dobrar = !dobrar;
    }
    return soma % 10 === 0;
  }

  function mensagemValidade(texto) {
    const partes = /^(\d{2})\/(\d{2})$/.exec(texto);
    if (!partes) return 'Use o formato MM/AA.';

    const mes = Number(partes[1]);
    const ano = 2000 + Number(partes[2]);
    if (mes < 1 || mes > 12) return 'Mês inválido.';

    const primeiroDiaDoMesSeguinte = new Date(ano, mes, 1);
    if (primeiroDiaDoMesSeguinte <= new Date()) return 'Cartão vencido.';
    return '';
  }

  function erroNoCampo(campo, mensagem) {
    campo.classList.toggle('is-invalid', Boolean(mensagem));
    return mostrarErro(campo.id + '-erro', mensagem);
  }

  const campoNumero = document.getElementById('cartao-numero');
  const campoNome = document.getElementById('cartao-nome');
  const campoValidade = document.getElementById('cartao-validade');
  const campoCvv = document.getElementById('cartao-cvv');
  const campoParcelas = document.getElementById('cartao-parcelas');

  campoNumero.addEventListener('input', function () {
    const digitos = campoNumero.value.replace(/\D/g, '').slice(0, 16);
    campoNumero.value = digitos.replace(/(.{4})/g, '$1 ').trim();
    document.getElementById('cartao-bandeira').textContent = digitos ? 'Bandeira: ' + bandeiraDoCartao(digitos) : '';
    erroNoCampo(campoNumero, '');
  });

  campoValidade.addEventListener('input', function () {
    const digitos = campoValidade.value.replace(/\D/g, '').slice(0, 4);
    campoValidade.value = digitos.length > 2 ? digitos.slice(0, 2) + '/' + digitos.slice(2) : digitos;
    erroNoCampo(campoValidade, '');
  });

  campoCvv.addEventListener('input', function () {
    campoCvv.value = campoCvv.value.replace(/\D/g, '').slice(0, 4);
    erroNoCampo(campoCvv, '');
  });

  campoNome.addEventListener('input', function () {
    erroNoCampo(campoNome, '');
  });

  function validarCartao() {
    const digitos = campoNumero.value.replace(/\D/g, '');
    const bandeira = bandeiraDoCartao(digitos);
    const tamanhoCvv = bandeira === 'Amex' ? 4 : 3;

    const resultados = [
      erroNoCampo(campoNumero, luhnValido(digitos) ? '' : 'Número de cartão inválido.'),
      erroNoCampo(campoNome, /^[\p{L}][\p{L}\s'.-]{2,}$/u.test(campoNome.value.trim()) ? '' : 'Informe o nome como está no cartão.'),
      erroNoCampo(campoValidade, mensagemValidade(campoValidade.value)),
      erroNoCampo(campoCvv, campoCvv.value.length === tamanhoCvv ? '' : 'O CVV deve ter ' + tamanhoCvv + ' números.'),
    ];
    if (resultados.includes(false)) return null;

    return {
      cartao: { bandeira: bandeira, final: digitos.slice(-4), parcelas: Number(campoParcelas.value) },
      recusar: digitos.slice(-4) === '0002',
    };
  }

  function atualizarParcelas() {
    const anterior = campoParcelas.value || '1';
    campoParcelas.replaceChildren();

    for (let parcelas = 1; parcelas <= MAXIMO_PARCELAS; parcelas++) {
      const valorDaParcela = formatarPreco(totalAPagar() / parcelas);
      const texto = parcelas + 'x de ' + valorDaParcela + (parcelas === 1 ? ' (à vista)' : ' sem juros');
      const opcao = criar('option', null, texto);
      opcao.value = String(parcelas);
      campoParcelas.append(opcao);
    }
    campoParcelas.value = anterior;
  }

  function atualizarBotao() {
    const metodo = valorSelecionado('metodo');
    botaoPagar.disabled = !metodo;

    switch (metodo) {
      case 'pix':
        botaoPagar.textContent = 'Confirmar pagamento do Pix';
        break;
      case 'cartao':
        botaoPagar.textContent = 'Pagar ' + formatarPreco(totalAPagar()) + ' no cartão';
        break;
      case 'local':
        botaoPagar.textContent = 'Confirmar pagamento na barbearia';
        break;
      default:
        botaoPagar.textContent = 'Escolha a forma de pagamento';
    }
  }

  function atualizarTotais() {
    document.getElementById('resumo-subtotal').textContent = formatarPreco(agendamento.valor);
    document.getElementById('linha-desconto').hidden = cupom.desconto === 0;
    document.getElementById('resumo-desconto').textContent = '- ' + formatarPreco(cupom.desconto);
    document.getElementById('resumo-total').textContent = formatarPreco(totalAPagar());

    atualizarParcelas();
    atualizarPix();
    atualizarBotao();
  }

  function mostrarPainel(metodo) {
    const paineis = { pix: 'painel-pix', cartao: 'painel-cartao', local: 'painel-local' };
    for (const chave in paineis) {
      document.getElementById(paineis[chave]).hidden = chave !== metodo;
    }
    avisoPagamento.hidden = true;
    atualizarBotao();
  }

  form.addEventListener('change', function (evento) {
    if (evento.target.name === 'metodo') {
      mostrarErro('metodo-erro', '');
      mostrarPainel(evento.target.value);
    }
  });

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();

    const metodo = valorSelecionado('metodo');
    if (!mostrarErro('metodo-erro', metodo ? '' : 'Escolha a forma de pagamento.')) return;

    switch (metodo) {
      case 'pix':
      case 'local':
        processar(metodo, {});
        break;
      case 'cartao': {
        const dadosDoCartao = validarCartao();
        if (dadosDoCartao) processar(metodo, dadosDoCartao);
        break;
      }
    }
  });

  function processar(metodo, extras) {
    avisoPagamento.hidden = true;
    botaoPagar.disabled = true;
    botaoPagar.replaceChildren(criar('span', 'spinner-border spinner-border-sm me-2'), document.createTextNode('Processando...'));

    setTimeout(function () {
      if (extras.recusar) {
        mostrarAviso('danger', 'Pagamento recusado pelo banco (cartão de teste de recusa). Tente outro cartão.');
        atualizarBotao();
        return;
      }
      concluirPagamento(metodo, extras);
    }, ESPERA_MS);
  }

  function concluirPagamento(metodo, extras) {
    const lista = Dados.agendamentos.listar();
    let alvo = null;
    for (let i = 0; i < lista.length; i++) {
      if (lista[i].id === agendamento.id) alvo = lista[i];
    }

    if (!alvo || alvo.status !== 'agendado') {
      mostrarIndisponivel('Este agendamento não está mais disponível para pagamento.');
      return;
    }

    const pagoOnline = metodo !== 'local';
    alvo.pagamento = {
      metodo: metodo,
      referencia: referencia,
      subtotal: agendamento.valor,
      cupom: cupom.codigo,
      desconto: cupom.desconto,
      total: totalAPagar(),
      pagoEm: pagoOnline ? new Date().toISOString() : null,
      cartao: extras.cartao || null,
    };
    if (pagoOnline) alvo.status = 'pago';

    if (!Dados.agendamentos.salvar(lista)) {
      mostrarAviso('danger', 'Não foi possível salvar o pagamento. Verifique se o navegador permite armazenamento local.');
      atualizarBotao();
      return;
    }

    agendamento = alvo;
    mostrarComprovante();
  }

  function mostrarComprovante() {
    const pagamento = agendamento.pagamento || {};
    const pago = agendamento.status === 'pago';
    const subtotal = pagamento.subtotal !== undefined ? pagamento.subtotal : agendamento.valor;
    const total = pagamento.total !== undefined ? pagamento.total : agendamento.valor;

    document.getElementById('comprovante-titulo').textContent = pago ? 'Pagamento aprovado!' : 'Reserva registrada!';
    document.getElementById('comprovante-subtitulo').textContent = pago
      ? 'Obrigado! Seu horário está garantido.'
      : 'Lembre-se de pagar na barbearia no dia do atendimento.';

    const linhas = [
      ['Nº do pedido', pagamento.referencia || '—'],
      ['Data do pagamento', pagamento.pagoEm ? formatarDataHora(pagamento.pagoEm) : 'A pagar na barbearia'],
      ['Forma de pagamento', descreverPagamento(pagamento)],
      ['Serviço', agendamento.servicoNome],
      ['Barbeiro', agendamento.barbeiro],
      ['Atendimento', formatarData(agendamento.data) + ' às ' + agendamento.hora],
      ['Subtotal', formatarPreco(subtotal)],
    ];
    if (pagamento.desconto > 0) {
      linhas.push(['Desconto (' + pagamento.cupom + ')', '- ' + formatarPreco(pagamento.desconto)]);
    }
    linhas.push([pago ? 'Total pago' : 'Total a pagar', formatarPreco(total)]);

    const lista = document.getElementById('comprovante-linhas');
    lista.replaceChildren();
    linhas.forEach(function (linha) {
      lista.append(criar('dt', null, linha[0]), criar('dd', null, linha[1]));
    });

    mostrarSo('area-comprovante');
  }

  document.getElementById('btn-imprimir').addEventListener('click', function () {
    window.print();
  });

  function iniciar() {
    if (!agendamento) {
      mostrarIndisponivel('Não encontramos este agendamento na sua conta.');
      return;
    }

    switch (agendamento.status) {
      case 'pago':
        mostrarComprovante();
        break;
      case 'cancelado':
        mostrarIndisponivel('Este agendamento foi cancelado e não pode ser pago.');
        break;
      case 'agendado':
        if (momento(agendamento.data, agendamento.hora) < new Date()) {
          mostrarIndisponivel('O horário deste agendamento já passou.');
        } else {
          document.getElementById('resumo-servico').textContent = agendamento.servicoNome;
          document.getElementById('resumo-barbeiro').textContent = agendamento.barbeiro;
          document.getElementById('resumo-data').textContent = formatarData(agendamento.data) + ' às ' + agendamento.hora;
          atualizarTotais();
          mostrarSo('area-pagamento');
        }
        break;
      default:
        mostrarIndisponivel('Não foi possível identificar a situação deste agendamento.');
    }
  }

  iniciar();
})();