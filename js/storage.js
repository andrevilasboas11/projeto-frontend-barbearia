const Dados = (function () {
  'use strict';

  const CHAVES = {
    usuarios: 'pb_usuarios',
    sessao: 'pb_sessao',
    agendamentos: 'pb_agendamentos',
  };

  function ler(chave, padrao) {
    try {
      const bruto = localStorage.getItem(chave);
      return bruto ? JSON.parse(bruto) : padrao;
    } catch (erro) {
      return padrao;
    }
  }

  function gravar(chave, valor) {
    try {
      localStorage.setItem(chave, JSON.stringify(valor));
      return true;
    } catch (erro) {
      return false;
    }
  }

  function remover(chave) {
    try {
      localStorage.removeItem(chave);
    } catch (erro) {
    }
  }

  return {
    usuarios: {
      listar: () => ler(CHAVES.usuarios, []),
      salvar: (lista) => gravar(CHAVES.usuarios, lista),
    },
    sessao: {
      obter: () => ler(CHAVES.sessao, null),
      definir: (sessao) => gravar(CHAVES.sessao, sessao),
      limpar: () => remover(CHAVES.sessao),
    },
    agendamentos: {
      listar: () => ler(CHAVES.agendamentos, []),
      salvar: (lista) => gravar(CHAVES.agendamentos, lista),
    },
  };
})();