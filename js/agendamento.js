(function () {
  'use strict';

  const { criar, doisDigitos, paraISO, dataDeISO, momento, formatarData, formatarPreco, valorSelecionado, mostrarErro, descreverPagamento } = Util;

  const SERVICOS = {
    corte: { nome: 'Corte de cabelo', preco: 40 },
    barba: { nome: 'Barba', preco: 30 },
    navalhado: { nome: 'Navalhado', preco: 35 },
    combo: { nome: 'Corte + barba', preco: 60 },
  };

  const BARBEIROS = ['João', 'Lucas', 'Igor'];

  const DIAS_MAXIMOS = 60;

  const INTERVALO_MINUTOS = 30;
  const PRIMEIRA_VAGA = 9 * 60;
  const ULTIMA_VAGA = 19 * 60 + 30;

  function funcionamentoDoDia(diaDaSemana) {
    switch (diaDaSemana) {
      case 0:
        return null;
      default:
        return { primeiraVaga: PRIMEIRA_VAGA, ultimaVaga: ULTIMA_VAGA };
    }
  }

  const usuario = Auth.exigirLogin();
  if (!usuario) return;

  const form = document.getElementById('form-agendamento');
  const campoData = document.getElementById('data');
  const campoObservacoes = document.getElementById('observacoes');
  const avisoForm = document.getElementById('aviso-agendamento');
  const grade = document.getElementById('grade-horarios');
  const dicaHorarios = document.getElementById('dica-horarios');
  const listaAgendamentos = document.getElementById('lista-agendamentos');
  const semAgendamentos = document.getElementById('sem-agendamentos');

  document.getElementById('nome-cliente').textContent = usuario.nome.split(' ')[0];

  function inicioDoDia(data) {
    return new Date(data.getFullYear(), data.getMonth(), data.getDate());
  }

  function gerarId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  const IDS_DOS_ERROS = ['servico-erro', 'barbeiro-erro', 'data-erro', 'hora-erro'];

  function rolarAteOPrimeiroErro() {
    for (let i = 0; i < IDS_DOS_ERROS.length; i++) {
      const caixa = document.getElementById(IDS_DOS_ERROS[i]);
      if (caixa.classList.contains('d-block')) {
        caixa.scrollIntoView({ block: 'center', behavior: 'smooth' });
        break;
      }
    }
  }

  const elementoModal = document.getElementById('modalPadrao');
  const modal = bootstrap.Modal.getOrCreateInstance(elementoModal);

  function mostrarModal(titulo, corpo, botoes) {
    document.getElementById('modalPadraoTitulo').textContent = titulo;
    document.getElementById('modalPadraoCorpo').replaceChildren(corpo);

    const rodape = document.getElementById('modalPadraoRodape');
    rodape.replaceChildren();
    botoes.forEach(function (botao) {
      const elemento = criar('button', 'btn ' + botao.classe, botao.texto);
      elemento.type = 'button';
      elemento.addEventListener('click', function () {
        modal.hide();
        if (botao.aoClicar) botao.aoClicar();
      });
      rodape.append(elemento);
    });

    modal.show();
  }

  function criarOpcao(nomeGrupo, id, valor, titulo, detalhe) {
    const fragmento = document.createDocumentFragment();

    const input = criar('input', 'btn-check');
    input.type = 'radio';
    input.name = nomeGrupo;
    input.id = id;
    input.value = valor;
    input.autocomplete = 'off';

    const rotulo = criar('label', 'btn btn-opcao');
    rotulo.htmlFor = id;
    rotulo.append(criar('span', 'opcao__titulo', titulo));
    if (detalhe) rotulo.append(criar('span', 'opcao__detalhe', detalhe));

    fragmento.append(input, rotulo);
    return fragmento;
  }

  const opcoesServico = document.getElementById('opcoes-servico');
  Object.keys(SERVICOS).forEach(function (chave) {
    const servico = SERVICOS[chave];
    opcoesServico.append(criarOpcao('servico', 'servico-' + chave, chave, servico.nome, formatarPreco(servico.preco)));
  });

  const opcoesBarbeiro = document.getElementById('opcoes-barbeiro');
  BARBEIROS.forEach(function (nome, indice) {
    opcoesBarbeiro.append(criarOpcao('barbeiro', 'barbeiro-' + indice, nome, nome));
  });

  const servicoDaUrl = new URLSearchParams(window.location.search).get('servico');
  if (servicoDaUrl && Object.prototype.hasOwnProperty.call(SERVICOS, servicoDaUrl)) {
    document.getElementById('servico-' + servicoDaUrl).checked = true;
  }

  const hoje = inicioDoDia(new Date());
  const limite = new Date(hoje);
  limite.setDate(limite.getDate() + DIAS_MAXIMOS);
  campoData.min = paraISO(hoje);
  campoData.max = paraISO(limite);

  function temVagaNoDia(data) {
    const regra = funcionamentoDoDia(data.getDay());
    if (regra === null) return false;

    const ultimaVaga = new Date(data);
    ultimaVaga.setHours(Math.floor(regra.ultimaVaga / 60), regra.ultimaVaga % 60, 0, 0);
    return ultimaVaga > new Date();
  }

  function primeiraDataDisponivel() {
    const data = new Date(hoje);
    let tentativas = 0;
    while (!temVagaNoDia(data) && tentativas < 14) {
      data.setDate(data.getDate() + 1);
      tentativas++;
    }
    return data;
  }

  function preencherDataInicial() {
    campoData.value = paraISO(primeiraDataDisponivel());
  }

  function validarData(valor) {
    if (!valor) return { erro: 'Escolha uma data.', data: null };

    const data = dataDeISO(valor);
    if (!data) return { erro: 'Data inválida.', data: null };
    if (data < hoje) return { erro: 'Essa data já passou. Escolha hoje ou uma data futura.', data: null };
    if (data > limite) return { erro: 'Só é possível agendar com até ' + DIAS_MAXIMOS + ' dias de antecedência.', data: null };
    if (funcionamentoDoDia(data.getDay()) === null) return { erro: 'Fechamos aos domingos. Escolha outro dia.', data: null };
    return { erro: '', data: data };
  }

  function horariosDoDia(data) {
    const regra = funcionamentoDoDia(data.getDay());
    const horas = [];
    for (let minutos = regra.primeiraVaga; minutos <= regra.ultimaVaga; minutos += INTERVALO_MINUTOS) {
      horas.push(doisDigitos(Math.floor(minutos / 60)) + ':' + doisDigitos(minutos % 60));
    }
    return horas;
  }

  function agendamentosAtivos() {
    return Dados.agendamentos.listar().filter(function (a) {
      return a.status !== 'cancelado';
    });
  }

  function motivoIndisponivel(dataISO, hora, barbeiro) {
    const noMesmoHorario = agendamentosAtivos().filter(function (a) {
      return a.data === dataISO && a.hora === hora;
    });

    if (noMesmoHorario.some(function (a) { return a.barbeiro === barbeiro; })) {
      return 'Horário já reservado com este barbeiro.';
    }
    if (noMesmoHorario.some(function (a) { return a.usuario === usuario.email; })) {
      return 'Você já tem um agendamento neste horário.';
    }

    if (momento(dataISO, hora) <= new Date()) return 'Esse horário já passou.';

    return '';
  }

  function renderizarHorarios() {
    const barbeiro = valorSelecionado('barbeiro');
    const horaAnterior = valorSelecionado('hora');
    const dataISO = campoData.value;
    const validacao = dataISO ? validarData(dataISO) : { erro: '', data: null };

    grade.replaceChildren();

    if (!barbeiro || !dataISO || validacao.erro) {
      dicaHorarios.hidden = false;
      dicaHorarios.textContent = validacao.erro
        ? 'Corrija a data para ver os horários.'
        : 'Escolha o barbeiro e a data para ver os horários.';
      return;
    }

    let livres = 0;
    horariosDoDia(validacao.data).forEach(function (hora) {
      const motivo = motivoIndisponivel(dataISO, hora, barbeiro);
      const id = 'hora-' + hora.replace(':', '');

      const input = criar('input', 'btn-check');
      input.type = 'radio';
      input.name = 'hora';
      input.id = id;
      input.value = hora;
      input.autocomplete = 'off';
      input.disabled = Boolean(motivo);
      if (!motivo) livres++;
      if (!motivo && hora === horaAnterior) input.checked = true;

      const rotulo = criar('label', 'btn btn-opcao', hora);
      rotulo.htmlFor = id;
      if (motivo) rotulo.title = motivo;

      grade.append(input, rotulo);
    });

    dicaHorarios.hidden = false;
    if (livres === 0) {
      dicaHorarios.textContent = 'Não há horários livres neste dia com este barbeiro. Tente outra data ou outro barbeiro.';
    } else {
      dicaHorarios.textContent = livres + (livres === 1 ? ' horário livre' : ' horários livres') + '. Os horários riscados estão indisponíveis.';
    }
  }

  function atualizarResumo() {
    const servico = SERVICOS[valorSelecionado('servico')];
    const hora = valorSelecionado('hora');

    document.getElementById('resumo-servico').textContent = servico ? servico.nome : '—';
    document.getElementById('resumo-barbeiro').textContent = valorSelecionado('barbeiro') || '—';
    document.getElementById('resumo-data').textContent = campoData.value ? formatarData(campoData.value) : '—';
    document.getElementById('resumo-hora').textContent = hora || '—';
    document.getElementById('resumo-total').textContent = formatarPreco(servico ? servico.preco : 0);
  }

  form.addEventListener('change', function (evento) {
    const nome = evento.target.name;

    if (nome === 'servico') mostrarErro('servico-erro', '');
    if (nome === 'barbeiro') mostrarErro('barbeiro-erro', '');
    if (nome === 'hora') mostrarErro('hora-erro', '');

    if (nome === 'data') {
      const validacao = validarData(campoData.value);
      campoData.classList.toggle('is-invalid', Boolean(validacao.erro));
      mostrarErro('data-erro', validacao.erro);
    }

    if (nome === 'barbeiro' || nome === 'data') renderizarHorarios();
    atualizarResumo();
  });

  form.addEventListener('submit', function (evento) {
    evento.preventDefault();
    avisoForm.hidden = true;

    const servicoId = valorSelecionado('servico');
    const barbeiro = valorSelecionado('barbeiro');
    const hora = valorSelecionado('hora');
    const validacaoData = validarData(campoData.value);

    let tudoCerto = true;
    tudoCerto = mostrarErro('servico-erro', servicoId ? '' : 'Escolha um serviço.') && tudoCerto;
    tudoCerto = mostrarErro('barbeiro-erro', barbeiro ? '' : 'Escolha um barbeiro.') && tudoCerto;
    tudoCerto = mostrarErro('data-erro', validacaoData.erro) && tudoCerto;
    campoData.classList.toggle('is-invalid', Boolean(validacaoData.erro));
    tudoCerto = mostrarErro('hora-erro', hora ? '' : 'Escolha um horário.') && tudoCerto;

    if (!tudoCerto) {
      rolarAteOPrimeiroErro();
      return;
    }

    const motivo = motivoIndisponivel(campoData.value, hora, barbeiro);
    if (motivo) {
      avisoForm.textContent = motivo + ' Escolha outro horário.';
      avisoForm.hidden = false;
      renderizarHorarios();
      return;
    }

    const servico = SERVICOS[servicoId];
    const novo = {
      id: gerarId(),
      usuario: usuario.email,
      servico: servicoId,
      servicoNome: servico.nome,
      valor: servico.preco,
      barbeiro: barbeiro,
      data: campoData.value,
      hora: hora,
      observacoes: campoObservacoes.value.trim().slice(0, 200),
      status: 'agendado',
      criadoEm: new Date().toISOString(),
    };

    const todos = Dados.agendamentos.listar();
    todos.push(novo);
    if (!Dados.agendamentos.salvar(todos)) {
      avisoForm.textContent = 'Não foi possível salvar o agendamento. Verifique se o navegador permite armazenamento local.';
      avisoForm.hidden = false;
      return;
    }

    form.reset();
    preencherDataInicial();
    renderizarHorarios();
    atualizarResumo();
    renderizarLista();

    const corpo = criar('div');
    corpo.append(criar('p', 'mb-2', 'Seu horário foi reservado:'));
    const detalhes = criar('ul', 'list-unstyled mb-3');
    [
      ['Serviço', novo.servicoNome],
      ['Barbeiro', novo.barbeiro],
      ['Data', formatarData(novo.data) + ' às ' + novo.hora],
      ['Valor', formatarPreco(novo.valor)],
    ].forEach(function (linha) {
      const item = criar('li');
      item.append(criar('strong', null, linha[0] + ': '), document.createTextNode(linha[1]));
      detalhes.append(item);
    });
    corpo.append(detalhes);
    corpo.append(criar('p', 'mb-0 text-muted', 'Você pode pagar agora ou depois, em "Meus agendamentos".'));

    mostrarModal('Agendamento confirmado!', corpo, [
      {
        texto: 'Pagar agora',
        classe: 'btn-barbearia',
        aoClicar: function () {
          window.location.href = 'pagamento.html?id=' + novo.id;
        },
      },
      {
        texto: 'Pagar depois',
        classe: 'btn-outline-secondary',
        aoClicar: function () {
          document.getElementById('meus-agendamentos').scrollIntoView({ behavior: 'smooth' });
        },
      },
    ]);
  });

  function momentoDoAgendamento(agendamento) {
    return momento(agendamento.data, agendamento.hora);
  }

  function situacao(agendamento) {
    let estado = agendamento.status;

    if ((estado === 'agendado' || estado === 'pago') && momentoDoAgendamento(agendamento) < new Date()) {
      estado = 'realizado';
    }

    switch (estado) {
      case 'cancelado':
        return { texto: 'Cancelado', classe: 'text-bg-secondary', ativo: false };
      case 'realizado':
        return { texto: 'Realizado', classe: 'text-bg-dark', ativo: false };
      case 'pago':
        return { texto: 'Pago', classe: 'text-bg-success', ativo: true };
      case 'agendado':
        return { texto: 'Agendado', classe: 'text-bg-warning', ativo: true };
      default:
        return { texto: 'Indefinido', classe: 'text-bg-light', ativo: false };
    }
  }

  function pedirCancelamento(agendamento) {
    let texto = 'Cancelar o agendamento de ' + agendamento.servicoNome + ' em ' +
      formatarData(agendamento.data) + ' às ' + agendamento.hora + '?';
    if (agendamento.status === 'pago') {
      texto += ' O valor pago será estornado (simulação).';
    }
    const corpo = criar('p', 'mb-0', texto);

    mostrarModal('Cancelar agendamento', corpo, [
      { texto: 'Voltar', classe: 'btn-outline-secondary' },
      {
        texto: 'Cancelar agendamento',
        classe: 'btn-danger',
        aoClicar: function () {
          const todos = Dados.agendamentos.listar();
          const alvo = todos.find(function (a) { return a.id === agendamento.id; });
          if (alvo) {
            if (alvo.status === 'pago' && alvo.pagamento) {
              alvo.pagamento.estornado = true;
            }
            alvo.status = 'cancelado';
            Dados.agendamentos.salvar(todos);
          }
          renderizarLista();
          renderizarHorarios();
        },
      },
    ]);
  }

  function criarItem(agendamento) {
    const estado = situacao(agendamento);

    const item = criar('article', 'item-agendamento' + (estado.ativo ? '' : ' item-agendamento--inativo'));

    const info = criar('div');
    const titulo = criar('h3', 'h6 mb-1', agendamento.servicoNome + ' ');
    titulo.append(criar('span', 'badge ' + estado.classe, estado.texto));
    info.append(titulo);
    info.append(criar('p', null, formatarData(agendamento.data) + ' às ' + agendamento.hora + ' · Barbeiro ' + agendamento.barbeiro));
    if (agendamento.observacoes) {
      info.append(criar('p', 'text-muted', 'Obs.: ' + agendamento.observacoes));
    }
    if (agendamento.pagamento) {
      const formaDePagamento = descreverPagamento(agendamento.pagamento);
      const estornado = agendamento.pagamento.estornado ? ' (estornado)' : '';
      info.append(criar('p', 'text-muted', 'Pagamento: ' + formaDePagamento + estornado));
    }

    const acoes = criar('div', 'item-agendamento__acoes');
    acoes.append(criar('strong', 'item-agendamento__valor', formatarPreco(agendamento.valor)));
    if (estado.ativo) {
      const linkPagamento = criar('a', null, agendamento.status === 'pago' ? 'Comprovante' : 'Pagar');
      linkPagamento.className = agendamento.status === 'pago' ? 'btn btn-outline-secondary btn-sm' : 'btn btn-barbearia btn-sm';
      linkPagamento.href = 'pagamento.html?id=' + encodeURIComponent(agendamento.id);
      acoes.append(linkPagamento);

      const botaoCancelar = criar('button', 'btn btn-outline-danger btn-sm', 'Cancelar');
      botaoCancelar.type = 'button';
      botaoCancelar.addEventListener('click', function () {
        pedirCancelamento(agendamento);
      });
      acoes.append(botaoCancelar);
    }

    item.append(info, acoes);
    return item;
  }

  function renderizarLista() {
    const meus = Dados.agendamentos.listar().filter(function (a) {
      return a.usuario === usuario.email;
    });

    meus.sort(function (a, b) {
      const aAtivo = situacao(a).ativo;
      const bAtivo = situacao(b).ativo;
      if (aAtivo !== bAtivo) return aAtivo ? -1 : 1;
      const diferenca = momentoDoAgendamento(a) - momentoDoAgendamento(b);
      return aAtivo ? diferenca : -diferenca;
    });

    listaAgendamentos.replaceChildren();
    semAgendamentos.hidden = meus.length > 0;
    meus.forEach(function (agendamento) {
      listaAgendamentos.append(criarItem(agendamento));
    });
  }

  preencherDataInicial();
  renderizarHorarios();
  atualizarResumo();
  renderizarLista();
})();