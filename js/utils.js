const Util = (function () {
  'use strict';

  const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  function criar(tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined) elemento.textContent = texto;
    return elemento;
  }

  function doisDigitos(numero) {
    return String(numero).padStart(2, '0');
  }

  function paraISO(data) {
    return data.getFullYear() + '-' + doisDigitos(data.getMonth() + 1) + '-' + doisDigitos(data.getDate());
  }

  function dataDeISO(iso) {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
    if (!partes) return null;
    const ano = Number(partes[1]);
    const mes = Number(partes[2]);
    const dia = Number(partes[3]);
    const data = new Date(ano, mes - 1, dia);
    const existe = data.getFullYear() === ano && data.getMonth() === mes - 1 && data.getDate() === dia;
    return existe ? data : null;
  }

  function momento(dataISO, hora) {
    const data = dataDeISO(dataISO);
    if (!data) return null;
    const partes = String(hora).split(':');
    data.setHours(Number(partes[0]), Number(partes[1]), 0, 0);
    return data;
  }

  function formatarData(iso) {
    const data = dataDeISO(iso);
    if (!data) return '—';
    return DIAS_SEMANA[data.getDay()] + ', ' + doisDigitos(data.getDate()) + '/' + doisDigitos(data.getMonth() + 1) + '/' + data.getFullYear();
  }

  function formatarDataHora(isoCompleto) {
    const data = new Date(isoCompleto);
    if (isNaN(data)) return '—';
    return doisDigitos(data.getDate()) + '/' + doisDigitos(data.getMonth() + 1) + '/' + data.getFullYear() +
      ' às ' + doisDigitos(data.getHours()) + ':' + doisDigitos(data.getMinutes());
  }

  function formatarPreco(valor) {
    return 'R$ ' + valor.toFixed(2).replace('.', ',');
  }

  function valorSelecionado(nome) {
    const opcoes = document.getElementsByName(nome);
    for (let i = 0; i < opcoes.length; i++) {
      if (opcoes[i].checked) return opcoes[i].value;
    }
    return '';
  }

  function mostrarErro(idDoErro, mensagem) {
    const caixa = document.getElementById(idDoErro);
    caixa.textContent = mensagem;
    caixa.classList.toggle('d-block', Boolean(mensagem));
    return !mensagem;
  }

  function descreverPagamento(pagamento) {
    if (!pagamento) return '';

    switch (pagamento.metodo) {
      case 'pix':
        return 'Pix';
      case 'cartao': {
        const cartao = pagamento.cartao || {};
        const parcelas = cartao.parcelas > 1 ? ' em ' + cartao.parcelas + 'x' : ' à vista';
        return (cartao.bandeira || 'Cartão') + ' final ' + (cartao.final || '----') + parcelas;
      }
      case 'local':
        return 'Na barbearia';
      default:
        return '';
    }
  }

  return {
    criar: criar,
    doisDigitos: doisDigitos,
    paraISO: paraISO,
    dataDeISO: dataDeISO,
    momento: momento,
    formatarData: formatarData,
    formatarDataHora: formatarDataHora,
    formatarPreco: formatarPreco,
    valorSelecionado: valorSelecionado,
    mostrarErro: mostrarErro,
    descreverPagamento: descreverPagamento,
  };
})();