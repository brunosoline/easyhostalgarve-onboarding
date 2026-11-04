/**
 * Easy Host Algarve — Ficha de Onboarding de Proprietários
 * ---------------------------------------------------------
 * Colar este código em: Sheet "Easy Host — Proprietários, Alojamentos e Compliance"
 *   → Extensões → Apps Script → ficheiro Código.gs → apagar o que lá estiver → colar → Guardar.
 * Depois de guardar: Implementar → Gerir implementações → editar a implementação "Aplicação Web"
 *   → Versão: "Nova versão" → Implementar (o link /exec mantém-se igual).
 *
 * O que faz:
 *  1. Cria o Google Form bilingue (PT/EN) ligado a esta sheet (separador "Respostas da ficha").
 *  2. Recebe a ficha online (onboarding.easyhostalgarve.pt) e guarda-a em "Fichas online".
 *  3. Cada ficha (Form ou site) vai para Proprietários, Alojamentos, Compliance e Hostkit,
 *     Seguros e validades e Pipeline — e chega um email de aviso.
 *  4. Não cria duplicados: o proprietário reconhece-se pelo NIF, depois pelo email, depois pelo nome;
 *     o alojamento pelo n.º RNAL ou, no mesmo proprietário, pelo código postal ou pelo nome.
 *     Quando já existe, só preenche campos vazios.
 *  5. Nunca escreve por cima de colunas com fórmulas nem apaga dados.
 */

// ===== Configuração =====
var CONFIG = {
  emailAviso: 'easyhostalgarve@gmail.com',
  tituloForm: 'Easy Host Algarve — Ficha de Onboarding / Owner Onboarding Form',
  nomeSeparadorRespostas: 'Respostas da ficha',
  separadores: {
    proprietarios: 'Proprietários',
    alojamentos: 'Alojamentos',
    compliance: 'Compliance e Hostkit',
    seguros: 'Seguros e validades',
    pipeline: 'Pipeline'
  },
  tipoSeguroRC: 'Seguro de responsabilidade civil (AL)',
  tipoExtintor: 'Revisão do extintor',
  faseFicha: '3 · Contrato e dados'
};

// ===== Perguntas (o título é a chave usada para ler as respostas — não alterar depois de criar) =====
var Q = {
  // 1. Proprietário
  nome: 'Nome completo ou denominação da empresa / Full name or company name',
  tipo: 'Tipo de proprietário / Owner type',
  nif: 'NIF / NIPC (número de contribuinte português / Portuguese tax number)',
  doc: 'N.º do Cartão de Cidadão ou passaporte / ID card or passport number',
  docValidade: 'Validade do documento / Document expiry date',
  nacionalidade: 'Nacionalidade / Nationality',
  paisResidencia: 'País de residência / Country of residence',
  residenteFiscal: 'É residente fiscal em Portugal? / Are you a tax resident in Portugal?',
  morada: 'Morada fiscal / Tax address',
  codPostal: 'Código postal (morada fiscal) / Postcode (tax address)',
  localidade: 'Localidade (morada fiscal) / Town (tax address)',
  email: 'Email',
  telemovel: 'Telemóvel (com indicativo) / Mobile (with country code)',
  idioma: 'Idioma preferido / Preferred language',
  contactoAlt: 'Contacto alternativo (nome e telefone) / Alternative contact (name and phone)',
  // 2. Fiscal e bancário
  atividade: 'Tem atividade aberta nas Finanças? / Do you have a registered activity with the Tax Authority?',
  regimeIva: 'Regime de IVA / VAT regime',
  contabilista: 'Nome do contabilista (se tiver) / Accountant name (if any)',
  contabilistaContacto: 'Contacto do contabilista / Accountant contact',
  iban: 'IBAN da conta onde vai receber as reservas / IBAN for booking payouts',
  ibanTitular: 'Titular da conta / Account holder',
  cmd: 'Tem Chave Móvel Digital ativa? / Do you have an active Chave Móvel Digital?',
  senhaAT: 'Tem a senha do Portal das Finanças? / Do you have your Portal das Finanças password?',
  // 3. Imóvel
  nomeAloj: 'Nome do alojamento (se já tiver) / Property name (if any)',
  moradaAloj: 'Morada completa do imóvel / Property full address',
  codPostalAloj: 'Código postal do imóvel / Property postcode',
  municipio: 'Concelho / Municipality',
  modalidade: 'Modalidade / Property type',
  tipologia: 'Tipologia / Layout',
  quartos: 'N.º de quartos / Bedrooms',
  camas: 'N.º total de camas (incluindo sofá-camas) / Total beds (including sofa beds)',
  wc: 'N.º de casas de banho / Bathrooms',
  capacidade: 'Capacidade máxima pretendida (hóspedes) / Intended maximum guests',
  area: 'Área útil (m²) / Floor area (m²)',
  artigo: 'Artigo matricial (está na caderneta predial) / Land registry article',
  licenca: 'N.º da licença / autorização de utilização (ou "anterior a 1951") / Occupancy permit number',
  rnal: 'Já tem registo de Alojamento Local (n.º RNAL)? Se sim, indique o número / Existing AL licence number (RNAL), if any',
  titularExploracao: 'Titular da exploração, se não for o proprietário / Licence holder, if not the owner',
  // 4. Comodidades
  piscina: 'Piscina / Pool',
  ac: 'Ar condicionado / Air conditioning',
  exterior: 'Exterior e extras / Outdoor and extras',
  estacionamento: 'Estacionamento / Parking',
  animais: 'Aceita animais? / Pets allowed?',
  entrada: 'Como entram os hóspedes? / How do guests get in?',
  distancias: 'Distâncias (praia, centro, supermercado) / Distances (beach, town, supermarket)',
  // 5. Funcionamento da casa
  wifi: 'Internet: operador e nome da rede (a password é pedida à parte) / Internet: provider and network name (password requested separately)',
  contratos: 'Contratos de água, luz, gás e internet: em nome de quem e quem paga? / Utility contracts: whose name and who pays?',
  chaves: 'Chaves: quantas cópias e de quê (porta, portão, garagem, correio) / Keys: how many copies and for what',
  alarme: 'Alarme: tem? Que empresa? (o código é pedido à parte) / Alarm: company (code requested separately)',
  tecnicos: 'Técnicos de confiança (canalizador, eletricista, piscina…) / Trusted technicians',
  lixo: 'Recolha do lixo e reciclagem: dias e local / Rubbish and recycling: days and location',
  // 6. Seguros e segurança
  temSeguro: 'Tem seguro de responsabilidade civil que cubra o Alojamento Local? / Do you have liability insurance covering short-term rental?',
  seguradora: 'Seguradora / Insurer',
  apolice: 'N.º da apólice / Policy number',
  capital: 'Capital de responsabilidade civil (€) / Liability cover (€)',
  premio: 'Prémio anual (€) / Annual premium (€)',
  seguroInicio: 'Data de início do seguro / Policy start date',
  seguroFim: 'Data de fim ou renovação do seguro / Policy end or renewal date',
  seguroAuto: 'A apólice renova automaticamente? / Does the policy renew automatically?',
  extintor: 'Validade / próxima revisão do extintor / Fire extinguisher expiry or next service',
  // 7. Preferências
  usoProprio: 'Datas em que quer usar a casa / Dates you want to use the house yourself',
  precoMin: 'Preço mínimo por noite que aceita (€) / Minimum nightly price you accept (€)',
  estadiaLonga: 'Aceita estadias longas (meses) ou empresas? / Accept long stays (months) or companies?',
  regras: 'Regras da casa (festas, fumar, silêncio…) / House rules (parties, smoking, quiet hours…)',
  observacoes: 'Algo mais que devamos saber? / Anything else we should know?',
  // 8. Consentimento
  consentimento: 'Consentimento / Consent'
};

var SIM_NAO = ['Sim / Yes', 'Não / No'];

// =====================================================================
// 1) Criar o formulário (correr UMA vez)
// =====================================================================
function criarFichaOnboarding() {
  var props = PropertiesService.getDocumentProperties();
  var existente = props.getProperty('FORM_ID');
  if (existente) {
    var f0 = FormApp.openById(existente);
    Logger.log('A ficha já existe. Link para enviar: ' + f0.getPublishedUrl());
    return;
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var form = FormApp.create(CONFIG.tituloForm);
  form.setDescription(
    'Obrigado por confiar na Easy Host Algarve. Esta ficha recolhe de uma só vez os dados de que precisamos para registar o ' +
    'Alojamento Local, configurar a faturação e publicar o anúncio. Demora cerca de 15–20 minutos. Tenha à mão: Cartão de Cidadão, ' +
    'caderneta predial, licença de utilização, IBAN e a apólice do seguro.\n\n' +
    'Thank you for choosing Easy Host Algarve. This form collects, in one go, everything we need to register your short-term ' +
    'rental, set up invoicing and publish your listing. It takes about 15–20 minutes. Please have at hand: ID, land registry ' +
    'certificate, occupancy permit, IBAN and your insurance policy.\n\n' +
    'Não escreva passwords nesta ficha — pedimos-lhas por canal seguro. / Do not write passwords in this form.'
  );
  form.setCollectEmail(false);
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);
  form.setProgressBar(true);
  form.setConfirmationMessage(
    'Ficha recebida. Vamos rever os dados e entramos em contacto em 48 horas. Envie os documentos para easyhostalgarve@gmail.com ' +
    '(Cartão de Cidadão, caderneta predial, licença de utilização, planta, apólice do seguro e comprovativo do IBAN).\n\n' +
    'Form received. We will review it and get back to you within 48 hours. Please email your documents to easyhostalgarve@gmail.com.'
  );

  // --- 1. Proprietário
  sec(form, '1. Proprietário / Owner', '');
  txt(form, Q.nome, true);
  mc(form, Q.tipo, ['Pessoa Singular', 'Empresa', 'Herança indivisa'], true);
  txtPadrao(form, Q.nif, true, '^\\d{9}$', 'O NIF tem 9 dígitos / The tax number has 9 digits');
  txt(form, Q.doc, true);
  data(form, Q.docValidade, false);
  txt(form, Q.nacionalidade, false);
  txt(form, Q.paisResidencia, true);
  mc(form, Q.residenteFiscal, SIM_NAO.concat(['Não sei / Not sure']), true);
  txt(form, Q.morada, true);
  txt(form, Q.codPostal, true);
  txt(form, Q.localidade, true);
  var em = form.addTextItem().setTitle(Q.email).setRequired(true);
  em.setValidation(FormApp.createTextValidation().requireTextIsEmail().build());
  txt(form, Q.telemovel, true);
  mc(form, Q.idioma, ['Português', 'English', 'Français', 'Deutsch', 'Español', 'Nederlands'], true);
  txt(form, Q.contactoAlt, false);

  // --- 2. Fiscal e bancário
  sec(form, '2. Fiscal e bancário / Tax and bank',
    'Se não souber responder, escolha "Não sei" — tratamos disso consigo. / If unsure, choose "Not sure" — we will help.');
  mc(form, Q.atividade, ['Sim, com CAE 55201 (Alojamento Local)', 'Sim, mas com outra atividade', 'Não', 'Não sei / Not sure'], true);
  mc(form, Q.regimeIva, ['Isenção art.º 53.º', 'Regime normal (6%)', 'Não sei'], true);
  txt(form, Q.contabilista, false);
  txt(form, Q.contabilistaContacto, false);
  txtPadrao(form, Q.iban, true, '^[A-Za-z]{2}[0-9]{2}[A-Za-z0-9 ]{10,32}$', 'IBAN inválido / Invalid IBAN');
  txt(form, Q.ibanTitular, true);
  mc(form, Q.cmd, SIM_NAO.concat(['Não sei / Not sure']), true);
  mc(form, Q.senhaAT, SIM_NAO.concat(['Não sei / Not sure']), true);

  // --- 3. Imóvel
  sec(form, '3. Imóvel / Property', 'Os dados devem bater com a caderneta predial. / Details must match the land registry certificate.');
  txt(form, Q.nomeAloj, false);
  txt(form, Q.moradaAloj, true);
  txt(form, Q.codPostalAloj, true);
  mcOutro(form, Q.municipio, ['Tavira', 'Olhão', 'Vila Real de Santo António', 'Castro Marim'], true);
  mc(form, Q.modalidade, ['Moradia', 'Apartamento', 'Estabelecimento de hospedagem', 'Quartos'], true);
  mc(form, Q.tipologia, ['T0', 'T1', 'T2', 'T3', 'T4', 'T5', 'T6 ou mais'], true);
  num(form, Q.quartos, true);
  num(form, Q.camas, true);
  num(form, Q.wc, true);
  num(form, Q.capacidade, true).setHelpText('Regra legal: 2 hóspedes por quarto + até 2 na sala. Acima de 10 hóspedes aplicam-se regras de segurança contra incêndio mais exigentes. / Legal rule: 2 guests per bedroom + up to 2 in the living room.');
  num(form, Q.area, false);
  txt(form, Q.artigo, false);
  txt(form, Q.licenca, false);
  txt(form, Q.rnal, false);
  txt(form, Q.titularExploracao, false);

  // --- 4. Comodidades
  sec(form, '4. Comodidades / Amenities', 'Para o anúncio no Airbnb e Booking. / For the Airbnb and Booking listing.');
  cb(form, Q.piscina, ['Não tem / None', 'Privada / Private', 'Partilhada / Shared', 'Aquecida / Heated'], true);
  mc(form, Q.ac, ['Em todos os quartos / All bedrooms', 'Em algumas divisões / Some rooms', 'Não tem / None'], true);
  cb(form, Q.exterior, ['Jardim / Garden', 'Terraço ou varanda / Terrace or balcony', 'Churrasqueira / BBQ', 'Refeições no exterior / Outdoor dining', 'Vista mar / Sea view', 'Lareira / Fireplace', 'Carregador elétrico / EV charger'], false);
  mc(form, Q.estacionamento, ['Privado / Private', 'Na rua, gratuito / Free street parking', 'Não tem / None'], true);
  mc(form, Q.animais, ['Sim / Yes', 'Só pequenos (até 10 kg) / Small only (up to 10 kg)', 'Não / No'], true);
  mc(form, Q.entrada, ['Fechadura inteligente / Smart lock', 'Cofre de chaves / Key box', 'Entrega presencial / In person', 'Ainda não sei / Not sure yet'], true);
  para(form, Q.distancias, false);

  // --- 5. Funcionamento
  sec(form, '5. Funcionamento da casa / House operations', 'Não escreva passwords nem códigos. / Do not write passwords or codes.');
  txt(form, Q.wifi, false);
  para(form, Q.contratos, false);
  txt(form, Q.chaves, false);
  txt(form, Q.alarme, false);
  para(form, Q.tecnicos, false);
  txt(form, Q.lixo, false);

  // --- 6. Seguros
  sec(form, '6. Seguro e segurança / Insurance and safety',
    'A lei portuguesa exige um seguro de responsabilidade civil que cubra danos a hóspedes e terceiros, com capital mínimo de ' +
    '75.000 € por sinistro. Sem seguro válido o registo de Alojamento Local pode ser cancelado. Usamos estas datas para o avisar ' +
    'a tempo da renovação.\n\nPortuguese law requires liability insurance covering guests and third parties (minimum 75,000 € per ' +
    'claim). Without valid insurance the licence can be cancelled. We use these dates to remind you before renewal.');
  mc(form, Q.temSeguro, ['Sim / Yes', 'Não — preciso de ajuda / No — I need help', 'Não sei / Not sure'], true);
  txt(form, Q.seguradora, false);
  txt(form, Q.apolice, false);
  num(form, Q.capital, false);
  num(form, Q.premio, false);
  data(form, Q.seguroInicio, false);
  data(form, Q.seguroFim, false);
  mc(form, Q.seguroAuto, SIM_NAO.concat(['Não sei / Not sure']), false);
  data(form, Q.extintor, false);

  // --- 7. Preferências
  sec(form, '7. Preferências / Preferences', '');
  para(form, Q.usoProprio, false);
  num(form, Q.precoMin, false);
  mc(form, Q.estadiaLonga, ['Sim / Yes', 'Não / No', 'Talvez — falar comigo / Maybe — let us talk'], false);
  para(form, Q.regras, false);
  para(form, Q.observacoes, false);

  // --- 8. Consentimento
  sec(form, '8. Documentos e consentimento / Documents and consent',
    'Depois de submeter, envie para easyhostalgarve@gmail.com: Cartão de Cidadão (frente e verso), caderneta predial, certidão ' +
    'permanente do registo predial, licença de utilização, planta do imóvel, apólice do seguro e comprovativo do IBAN.\n\n' +
    'After submitting, email us: ID (both sides), land registry certificate, occupancy permit, floor plan, insurance policy and IBAN proof.');
  var c = form.addCheckboxItem().setTitle(Q.consentimento).setRequired(true);
  c.setChoiceValues(['Autorizo a Easy Host Algarve a tratar estes dados para a gestão do meu alojamento, nos termos do RGPD. / ' +
    'I authorise Easy Host Algarve to process this data to manage my property, under the GDPR.']);

  // Ligar à sheet e renomear o separador de respostas
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  SpreadsheetApp.flush();
  Utilities.sleep(2000);
  ss.getSheets().forEach(function (sh) {
    var u = sh.getFormUrl();
    if (u && u.indexOf(form.getId()) >= 0) {
      sh.setName(CONFIG.nomeSeparadorRespostas);
    }
  });

  // Guardar o formulário na mesma pasta da sheet
  try {
    var pasta = DriveApp.getFileById(ss.getId()).getParents().next();
    DriveApp.getFileById(form.getId()).moveTo(pasta);
  } catch (err) { Logger.log('Não foi possível mover o formulário: ' + err); }

  // Gatilho de submissão
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === 'aoSubmeterFicha') ScriptApp.deleteTrigger(t);
  });
  ScriptApp.newTrigger('aoSubmeterFicha').forSpreadsheet(ss).onFormSubmit().create();

  props.setProperty('FORM_ID', form.getId());
  Logger.log('Ficha criada. Link para enviar aos proprietários: ' + form.getPublishedUrl());
  Logger.log('Link para editar a ficha: ' + form.getEditUrl());
}

// =====================================================================
// 2) Gatilho: cada submissão alimenta o registo
// =====================================================================
function aoSubmeterFicha(e) {
  var lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  try {
    var shResp = e.range.getSheet();
    var cabecalhos = shResp.getRange(1, 1, 1, shResp.getLastColumn()).getValues()[0];
    var valores = e.range.getValues()[0];
    var r = {};
    cabecalhos.forEach(function (h, i) { r[String(h).trim()] = valores[i]; });
    processarResposta(r, "'" + CONFIG.nomeSeparadorRespostas + "' linha " + e.range.getRow());
  } finally {
    lock.releaseLock();
  }
}

/** Reprocessar manualmente a linha selecionada no separador "Respostas da ficha". */
function reprocessarLinhaSelecionada() {
  var sh = SpreadsheetApp.getActiveSheet();
  if (sh.getName() !== CONFIG.nomeSeparadorRespostas) {
    SpreadsheetApp.getUi().alert('Selecione uma linha no separador "' + CONFIG.nomeSeparadorRespostas + '".');
    return;
  }
  var linha = sh.getActiveRange().getRow();
  if (linha < 2) return;
  var cab = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var val = sh.getRange(linha, 1, 1, sh.getLastColumn()).getValues()[0];
  var r = {};
  cab.forEach(function (h, i) { r[String(h).trim()] = val[i]; });
  var res = processarResposta(r, "'" + CONFIG.nomeSeparadorRespostas + "' linha " + linha);
  SpreadsheetApp.getUi().alert('Processado: ' + res.propId + ' / ' + res.alojId);
}

function processarResposta(r, refFicha) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoje = new Date();
  var v = function (k) { var x = r[Q[k]]; return (x === undefined || x === null) ? '' : x; };
  var limpa = function (s) { return String(s).split(' / ')[0].trim(); }; // "Sim / Yes" -> "Sim"

  // ---------- Proprietário ----------
  // Reconhece pelo NIF; se a linha ainda não tiver NIF, pelo email; por fim pelo nome.
  var shP = ss.getSheetByName(CONFIG.separadores.proprietarios);
  var nif = String(v('nif')).replace(/\D/g, '');
  var emailP = String(v('email')).trim().toLowerCase();
  var nomeP = normTxt_(v('nome'));
  var linhaP = encontrarLinha(shP, 'NIF / NIPC', function (x) { return nif !== '' && String(x).replace(/\D/g, '') === nif; }) ||
    encontrarLinha(shP, 'Email', function (x, linha) {
      var nifLinha = String(valorEm(shP, linha, 'NIF / NIPC')).replace(/\D/g, '');
      return emailP !== '' && String(x).trim().toLowerCase() === emailP && (!nifLinha || nifLinha === nif);
    }) ||
    encontrarLinha(shP, 'Nome / Denominação', function (x, linha) {
      var nifLinha = String(valorEm(shP, linha, 'NIF / NIPC')).replace(/\D/g, '');
      return nomeP !== '' && normTxt_(x) === nomeP && (!nifLinha || nifLinha === nif);
    });

  // ---------- Alojamento (procura-se antes de decidir o proprietário) ----------
  // Reconhece pelo n.º RNAL; depois pelo código postal + nome do alojamento; depois, no mesmo proprietário,
  // pelo código postal ou pelo nome. Se o alojamento já existir, o proprietário é o desse alojamento.
  var shA = ss.getSheetByName(CONFIG.separadores.alojamentos);
  var cpAloj = normCp_(v('codPostalAloj'));
  var moradaAloj = String(v('moradaAloj')).trim();
  var rnalAloj = normRnal_(v('rnal'));
  var nomeAlojFicha = normTxt_(v('nomeAloj'));
  var propIdConhecido = linhaP ? String(valorEm(shP, linhaP, 'ID Proprietário')).trim() : '';
  var linhaA = (rnalAloj && encontrarLinha(shA, 'N.º RNAL', function (x) { return normRnal_(x) === rnalAloj; })) ||
    (cpAloj && nomeAlojFicha && encontrarLinha(shA, 'Nome comercial', function (x, linha) {
      return normTxt_(x) === nomeAlojFicha && normCp_(valorEm(shA, linha, 'Código postal')) === cpAloj;
    })) ||
    (propIdConhecido && encontrarLinha(shA, 'ID Proprietário', function (x, linha) {
      if (String(x).trim() !== propIdConhecido) return false;
      var cp = normCp_(valorEm(shA, linha, 'Código postal'));
      var nomeLinha = normTxt_(valorEm(shA, linha, 'Nome comercial'));
      return (cpAloj !== '' && cp === cpAloj) || (nomeAlojFicha !== '' && nomeLinha === nomeAlojFicha);
    }));
  var propDoAloj = linhaA ? String(valorEm(shA, linhaA, 'ID Proprietário')).trim() : '';
  if (!linhaP && propDoAloj) {
    linhaP = encontrarLinha(shP, 'ID Proprietário', function (x) { return String(x).trim() === propDoAloj; });
  }
  var propId = linhaP ? valorEm(shP, linhaP, 'ID Proprietário') : proximoId(shP, 'ID Proprietário', 'PROP-');
  var outroDono = linhaA && propDoAloj && propDoAloj !== String(propId).trim();
  var tipo = v('tipo');
  var atividade = String(v('atividade'));
  var regime = String(v('regimeIva'));
  var dadosP = {
    'ID Proprietário': propId,
    'Nome / Denominação': v('nome'),
    'Tipo': tipo,
    'NIF / NIPC': nif,
    'N.º CC / Documento': v('doc'),
    'Validade do documento': v('docValidade'),
    'Nacionalidade': v('nacionalidade'),
    'País de residência': v('paisResidencia'),
    'Morada fiscal': v('morada'),
    'Código postal': normCp_(v('codPostal')),
    'Localidade': v('localidade'),
    'Email': v('email'),
    'Telemóvel': v('telemovel'),
    'Idioma preferido': v('idioma'),
    'Enquadramento (ENI / Empresa)': tipo === 'Empresa' ? 'Empresa' : (tipo === 'Herança indivisa' ? 'Herança indivisa' : (tipo ? 'ENI' : '')),
    'Regime de IVA': (regime === 'Não sei' || regime === '') ? '' : regime,
    'CAE': atividade.indexOf('55201') >= 0 ? '55201' : (atividade.indexOf('outra') >= 0 ? 'Outra atividade (falta 55201)' : (atividade === 'Não' ? 'Sem atividade aberta' : '')),
    'Contabilista': v('contabilista'),
    'Contacto do contabilista': v('contabilistaContacto'),
    'IBAN': String(v('iban')).replace(/\s/g, '').toUpperCase(),
    'Titular do IBAN': v('ibanTitular'),
    'Contacto alternativo': v('contactoAlt'),
    'Residente fiscal em Portugal': limpa(v('residenteFiscal')),
    'Observações': r.__obsProp || ''
  };
  linhaP = escreverLinha(shP, linhaP, dadosP);

  // ---------- Alojamento ----------
  var alojId = linhaA ? valorEm(shA, linhaA, 'ID Alojamento') : proximoId(shA, 'ID Alojamento', 'ALOJ-');
  var nomeExistente = linhaA ? String(valorEm(shA, linhaA, 'Nome comercial')).trim() : '';
  // Nunca usar o nome do proprietário como nome do alojamento.
  var nomeAloj = nomeExistente || String(v('nomeAloj')).trim() ||
    ('Alojamento em ' + (v('municipio') || cpAloj || 'local por indicar') + ' (nome por definir)');
  var item = function (rotulo, valor) { return valor ? rotulo + ': ' + valor : ''; };
  var resumoComodidades = [
    item('Piscina', v('piscina')), item('AC', limpa(v('ac'))), item('Estacionamento', limpa(v('estacionamento'))),
    item('Animais', limpa(v('animais'))), item('Entrada', limpa(v('entrada'))), item('Extras', v('exterior'))
  ].filter(String).join(' · ');
  var dadosA = {
    'ID Alojamento': alojId,
    'ID Proprietário': outroDono ? propDoAloj : propId,
    'Nome comercial': nomeAloj,
    'Morada': moradaAloj,
    'Código postal': cpAloj,
    'Município': v('municipio'),
    'Distrito': 'Faro',
    'N.º RNAL': v('rnal'),
    'Titular da exploração': v('titularExploracao') || v('nome'),
    'Modalidade': v('modalidade'),
    'Tipologia': v('tipologia'),
    'Capacidade (hóspedes)': v('capacidade'),
    'Quartos': v('quartos'),
    'Camas': v('camas'),
    'Casas de banho': v('wc'),
    'Área (m²)': v('area'),
    'Artigo matricial': v('artigo'),
    'Autorização de utilização (n.º)': v('licenca'),
    'Estado': 'Em onboarding',
    'Observações': r.__obsAloj || resumoComodidades,
    'Ficha de onboarding': refFicha
  };
  linhaA = escreverLinha(shA, linhaA, dadosA, ['Ficha de onboarding']);

  // ---------- Compliance e Hostkit ----------
  var shC = ss.getSheetByName(CONFIG.separadores.compliance);
  var linhaC = encontrarLinha(shC, 'ID Alojamento', function (x) { return x === alojId; });
  if (!linhaC) {
    var dadosC = { 'ID Alojamento': alojId, 'Alojamento': nomeAloj };
    var semEstado = ['ID Alojamento', 'Alojamento', 'SIBA: Unidade', 'SIBA: Estabelecimento', 'Taxa turística: plataforma',
      '% concluído', 'Pendências', 'Observações'];
    cabecalhosDe(shC).forEach(function (h) {
      if (h && semEstado.indexOf(h) < 0) dadosC[h] = 'Por verificar';
    });
    dadosC['Seguro RC em dia'] = 'Pendente';
    if (v('modalidade') !== 'Apartamento') dadosC['Autorização do condomínio (se fração)'] = 'Não aplicável';
    if (v('rnal')) dadosC['RNAL ativo (consulta no RNT)'] = 'Por verificar';
    dadosC['Observações'] = 'Criado pela ficha de onboarding em ' + Utilities.formatDate(hoje, Session.getScriptTimeZone(), 'dd/MM/yyyy') + '.';
    var extraC = r.__compliance || {};
    Object.keys(extraC).forEach(function (k) { if (extraC[k]) dadosC[k] = extraC[k]; });
    escreverLinha(shC, null, dadosC);
  }

  // ---------- Seguros e validades ----------
  var shS = ss.getSheetByName(CONFIG.separadores.seguros);
  var temSeguro = limpa(v('temSeguro'));
  var dadosS = {
    'ID Alojamento': alojId,
    'Alojamento': nomeAloj,
    'Proprietário': v('nome'),
    'Tipo': CONFIG.tipoSeguroRC,
    'Seguradora / entidade': v('seguradora'),
    'N.º apólice / referência': v('apolice'),
    'Capital seguro (€)': v('capital'),
    'Prémio anual (€)': v('premio'),
    'Data de início': v('seguroInicio'),
    'Data de fim / renovação': v('seguroFim'),
    'Renovação automática': limpa(v('seguroAuto')) === 'Não sei' ? '' : limpa(v('seguroAuto')),
    'Quem trata da renovação': 'Proprietário',
    'Observações': temSeguro === 'Sim'
      ? (v('seguroFim') ? '' : 'Pedir ao proprietário a data de fim da apólice.')
      : 'Proprietário sem seguro RC para AL (' + temSeguro + '). Tratar antes do registo RNAL.'
  };
  if (v('capital') !== '' && Number(v('capital')) < 75000) {
    dadosS['Observações'] = (dadosS['Observações'] ? dadosS['Observações'] + ' ' : '') + 'Capital abaixo do mínimo legal de 75.000 €.';
  }
  var linhaS = encontrarLinha(shS, 'ID Alojamento', function (x, linha) {
    return x === alojId && valorEm(shS, linha, 'Tipo') === CONFIG.tipoSeguroRC;
  });
  escreverLinha(shS, linhaS, dadosS);

  if (v('extintor')) {
    var linhaE = encontrarLinha(shS, 'ID Alojamento', function (x, linha) {
      return x === alojId && valorEm(shS, linha, 'Tipo') === CONFIG.tipoExtintor;
    });
    escreverLinha(shS, linhaE, {
      'ID Alojamento': alojId, 'Alojamento': nomeAloj, 'Proprietário': v('nome'), 'Tipo': CONFIG.tipoExtintor,
      'Data de fim / renovação': v('extintor'), 'Quem trata da renovação': 'Easy Host'
    });
  }

  // ---------- Pipeline ----------
  var shL = ss.getSheetByName(CONFIG.separadores.pipeline);
  var email = String(v('email')).trim().toLowerCase();
  var tel = String(v('telemovel')).replace(/\D/g, '').slice(-9);
  var linhaL = encontrarLinha(shL, 'ID Lead', function (x, linha) {
    if (!x) return false;
    if (valorEm(shL, linha, 'ID Alojamento') === alojId) return true;
    var em = String(valorEm(shL, linha, 'Email')).trim().toLowerCase();
    var tl = String(valorEm(shL, linha, 'Telemóvel')).replace(/\D/g, '').slice(-9);
    var semAloj = !valorEm(shL, linha, 'ID Alojamento');
    return semAloj && ((email && em === email) || (tel && tl === tel));
  });
  var estadoSN = function (k) {
    var s = limpa(v(k));
    if (s === 'Não aplicável') return 'Não aplicável';
    return s === 'Sim' ? 'Feito' : (s === 'Não' ? 'Pendente' : 'Por verificar');
  };
  var dadosL = {
    'Proprietário / contacto': v('nome'),
    'Alojamento': nomeAloj,
    'Telemóvel': v('telemovel'),
    'Email': v('email'),
    'Concelho': v('municipio'),
    'Tipologia': v('tipologia'),
    'Chave Móvel Digital': estadoSN('cmd'),
    'Senha Portal das Finanças': estadoSN('senhaAT'),
    'Ficha de onboarding recebida': hoje,
    'N.º RNAL': v('rnal'),
    'ID Proprietário': propId,
    'ID Alojamento': alojId
  };
  if (!linhaL) {
    dadosL['ID Lead'] = proximoId(shL, 'ID Lead', 'LEAD-');
    dadosL['Data de entrada'] = hoje;
    dadosL['Fase atual'] = CONFIG.faseFicha;
    dadosL['Próximo passo'] = 'Rever a ficha e confirmar dados com a caderneta predial';
    dadosL['Data do próximo passo'] = new Date(hoje.getTime() + 2 * 86400000);
    escreverLinha(shL, null, dadosL);
  } else {
    var fase = String(valorEm(shL, linhaL, 'Fase atual'));
    var nFase = parseInt(fase, 10);
    if (!fase || (nFase && nFase < 3)) {
      dadosL['Fase atual'] = CONFIG.faseFicha;
      dadosL['Próximo passo'] = 'Rever a ficha e confirmar dados com a caderneta predial';
      dadosL['Data do próximo passo'] = new Date(hoje.getTime() + 2 * 86400000);
    }
    // Na linha existente, a data de receção da ficha e os IDs atualizam sempre; o resto só preenche vazios.
    escreverLinha(shL, linhaL, dadosL, ['Ficha de onboarding recebida', 'ID Proprietário', 'ID Alojamento', 'Fase atual',
      'Próximo passo', 'Data do próximo passo', 'Chave Móvel Digital', 'Senha Portal das Finanças']);
  }

  // ---------- Aviso por email ----------
  try {
    var alertas = [];
    if (linhaA && nomeExistente) alertas.push('Ficha associada a um alojamento que já existia (' + alojId + '): só foram preenchidos campos vazios.');
    if (outroDono) alertas.push('O alojamento ' + alojId + ' está registado em nome de ' + propDoAloj + ', mas a ficha veio de ' + propId + '. Confirmar quem é o proprietário.');
    if (temSeguro !== 'Sim') alertas.push('Sem seguro RC para AL indicado.');
    if (temSeguro === 'Sim' && !v('seguroFim')) alertas.push('Falta a data de fim do seguro.');
    if (v('capital') !== '' && Number(v('capital')) < 75000) alertas.push('Capital do seguro abaixo de 75.000 €.');
    if (parseInt(v('capacidade'), 10) > 10) alertas.push('Capacidade acima de 10: aplica-se o regime SCIE.');
    if (['Feito', 'Não aplicável'].indexOf(estadoSN('cmd')) < 0) alertas.push('Sem Chave Móvel Digital confirmada (bloqueia o RNAL).');
    if (estadoSN('senhaAT') !== 'Feito') alertas.push('Sem senha do Portal das Finanças (pedir já, chega por carta).');
    if (atividade === 'Não' || atividade.indexOf('Não sei') === 0) alertas.push('Sem atividade aberta com o CAE 55201: abrir antes de faturar.');
    MailApp.sendEmail({
      to: CONFIG.emailAviso,
      subject: 'Nova ficha de onboarding: ' + v('nome') + ' — ' + nomeAloj,
      body: 'Nova ficha recebida e registada.\n\n' +
        'Proprietário: ' + v('nome') + ' (' + propId + ')\n' +
        'Alojamento: ' + nomeAloj + ' (' + alojId + '), ' + v('municipio') + '\n' +
        'Contacto: ' + v('telemovel') + ' · ' + v('email') + '\n\n' +
        (alertas.length ? 'Atenção:\n- ' + alertas.join('\n- ') + '\n\n' : '') +
        'Sheet: ' + ss.getUrl()
    });
  } catch (err) { Logger.log('Email não enviado: ' + err); }

  return { propId: propId, alojId: alojId };
}

// =====================================================================
// 3) Ficha online (onboarding.easyhostalgarve.pt) → esta sheet
//    Implementar → Nova implementação → Aplicação Web
//    (Executar como: Eu · Quem tem acesso: Qualquer pessoa)
// =====================================================================
var SEPARADOR_WEB = 'Fichas online';

function doGet() {
  return json_({ ok: true, servico: 'Ficha de onboarding Easy Host Algarve' });
}

function doPost(e) {
  var lock = LockService.getDocumentLock();
  try {
    lock.waitLock(30000);
    var p = JSON.parse(e.postData.contents);
    if (p.website) return json_({ ok: true }); // armadilha anti-spam
    var c = p.campos || {};
    if (!c.nome || !c.email || c.decl_ok !== 'Sim') return json_({ ok: false, error: 'dados em falta' });

    // 1. Guardar a ficha completa (uma coluna por pergunta)
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SEPARADOR_WEB) || criarSeparadorWeb_(ss);
    var labels = p.labels || {};
    var cab = cabecalhosDe(sh);
    var chaves = Object.keys(c).filter(function (k) { return labels[k]; });
    var falta = chaves.map(function (k) { return labels[k]; }).filter(function (l) { return cab.indexOf(l) < 0; });
    if (falta.length) {
      sh.getRange(1, cab.length + 1, 1, falta.length).setValues([falta]);
      cab = cab.concat(falta);
    }
    var linha = new Array(cab.length).fill('');
    linha[cab.indexOf('Recebida em')] = new Date();
    linha[cab.indexOf('Idioma do formulário')] = p.lang || '';
    chaves.forEach(function (k) { var i = cab.indexOf(labels[k]); if (i >= 0) linha[i] = c[k]; });
    var n = ultimaLinha(sh) + 1;
    sh.getRange(n, 1, 1, cab.length).setValues([linha]);

    // 2. Distribuir pelos separadores do registo
    var r = mapearFichaWeb_(c);
    var res = processarResposta(r, "'" + SEPARADOR_WEB + "' linha " + n);
    sh.getRange(n, cab.indexOf('ID Proprietário') + 1).setValue(res.propId);
    sh.getRange(n, cab.indexOf('ID Alojamento') + 1).setValue(res.alojId);
    return json_({ ok: true, propId: res.propId, alojId: res.alojId });
  } catch (err) {
    Logger.log(err);
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

function criarSeparadorWeb_(ss) {
  var sh = ss.insertSheet(SEPARADOR_WEB);
  sh.getRange(1, 1, 1, 4).setValues([['Recebida em', 'ID Proprietário', 'ID Alojamento', 'Idioma do formulário']]);
  sh.setFrozenRows(1);
  sh.getRange('1:1').setFontWeight('bold').setBackground('#2F4A2B').setFontColor('#FFFFFF').setWrap(true);
  return sh;
}

function json_(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function dataIso_(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : '';
}

/** Converte as respostas da ficha online para o formato das perguntas do Google Form (Q). */
function mapearFichaWeb_(c) {
  var r = {};
  var set = function (k, val) { if (val !== undefined && val !== null && val !== '') r[Q[k]] = val; };
  var empresa = c.tipo === 'Empresa';
  var heranca = c.tipo === 'Herança indivisa';
  var comod = String(c.comodidades || '');
  var tem = function (x) { return comod.split(', ').indexOf(x) >= 0; };
  var seg = String(c.seguranca || '').split(', ');
  var nQuartos = c.tipologia === 'T0' ? 0 : parseInt(String(c.tipologia || '').replace(/\D/g, ''), 10);
  var camasTotal = 0;
  Object.keys(c).forEach(function (k) { if (k.indexOf('camas_') === 0) camasTotal += Number(c[k]) || 0; });
  // Fichas antigas tinham a morada fiscal numa só caixa; as novas trazem rua, código postal e localidade à parte.
  var cpAntigo = String(c.morada || '').match(/(\d{4}-?\d{3})\s*([^,\n]*)/);
  var titular = empresa && c.empresa ? c.empresa : (heranca && c.heranca ? c.heranca : c.nome);
  var docPrefixo = { 'Cartão de Cidadão': 'CC', 'Passaporte': 'Passaporte', 'Outro documento': 'Outro:' };

  set('nome', titular);
  set('tipo', empresa ? 'Empresa' : (heranca ? 'Herança indivisa' : 'Pessoa Singular'));
  set('nif', c.nif);
  set('doc', c.doc ? ((docPrefixo[c.docTipo] ? docPrefixo[c.docTipo] + ' ' : '') + String(c.doc).trim()) : '');
  set('docValidade', dataIso_(c.docValidade));
  set('nacionalidade', c.nacionalidade || (c.docTipo === 'Cartão de Cidadão' ? 'Portuguesa' : ''));
  set('paisResidencia', c.paisResidencia === 'Outro' ? c.paisOutro : c.paisResidencia);
  // Quem tem a morada fiscal em Portugal não responde à pergunta: fica "Sim".
  set('residenteFiscal', c.residenteFiscal || (c.paisResidencia === 'Portugal' && !empresa ? 'Sim' : ''));
  if (c.cpFiscal || c.localidadeFiscal) {
    set('morada', c.morada);
    set('codPostal', c.paisResidencia === 'Portugal' ? normCp_(c.cpFiscal) : c.cpFiscal);
    set('localidade', c.localidadeFiscal);
  } else {
    set('morada', c.morada);
    if (cpAntigo) { set('codPostal', normCp_(cpAntigo[1])); set('localidade', cpAntigo[2].trim()); }
  }
  set('email', c.email);
  set('telemovel', c.telemovel);
  set('idioma', c.idioma);
  set('contactoAlt', c.contactoAlt);
  set('atividade', c.atividade);
  // O regime de IVA só é perguntado a quem já tem atividade aberta.
  if (c.regimeIva) set('regimeIva', /53/.test(c.regimeIva) ? 'Isenção art.º 53.º' : (/normal/i.test(c.regimeIva) ? 'Regime normal (6%)' : 'Não sei'));
  set('contabilista', c.contabilista);
  set('contabilistaContacto', c.contabilistaContacto);
  set('iban', c.iban);
  set('ibanTitular', c.ibanProprio === 'Não' ? c.ibanTitular : titular);
  set('cmd', empresa ? 'Não aplicável' : c.cmd);
  set('senhaAT', c.senhaAT);
  set('nomeAloj', c.nomeAloj);
  set('moradaAloj', c.moradaAloj);
  set('codPostalAloj', normCp_(c.codPostalAloj));
  set('municipio', c.municipio);
  set('modalidade', /^Quartos/.test(c.modalidade) ? 'Quartos' : c.modalidade);
  set('tipologia', c.tipologia);
  if (!isNaN(nQuartos)) r[Q.quartos] = nQuartos;
  if (camasTotal) set('camas', camasTotal);
  set('wc', c.wc);
  set('capacidade', c.capacidade);
  set('area', c.area);
  set('artigo', c.artigo);
  set('licenca', c.licenca === 'Tenho' ? (c.licencaNum || 'Tem (n.º por indicar)') : (/1951/.test(c.licenca) ? 'Anterior a 1951' : ''));
  if (c.temRnal === 'Sim') set('rnal', c.rnal);
  if (c.titularProprio === 'Não') set('titularExploracao', c.titularExploracao);
  set('piscina', tem('Piscina') ? (c.piscinaTipo || 'Sim') : 'Não tem');
  set('ac', tem('Ar condicionado') ? (c.acTodos || 'Sim') : 'Não tem');
  set('exterior', tem('Churrasqueira') ? 'Churrasqueira' : '');
  set('estacionamento', c.estacionamentoTipo || '');
  set('animais', c.animais);
  set('entrada', c.entrada);
  set('distancias', c.distancias);
  set('temSeguro', c.temSeguro);
  set('seguradora', c.seguradora);
  set('apolice', c.apolice);
  set('capital', c.capital);
  set('seguroFim', dataIso_(c.seguroFim));
  set('seguroAuto', c.seguroAuto);
  set('extintor', dataIso_(c.extintor));
  set('usoProprio', c.usoProprio);
  set('precoMin', c.precoMin);
  set('estadiaLonga', c.estadiaLonga);
  set('observacoes', c.observacoes);
  set('consentimento', c.decl_ok);

  // Estado inicial no separador Compliance e Hostkit
  var estado = function (resposta) { return resposta === 'Sim' ? 'Por verificar' : (resposta ? 'Pendente' : ''); };
  r.__compliance = {
    'AT: subutilizador criado': c.subAT === 'Sim' ? 'Por verificar' : 'Pendente',
    'SIBA: adesão feita': c.temRnal === 'Sim' ? estado(c.siba) : 'Pendente',
    'Taxa turística: registo feito': c.temRnal === 'Sim' ? estado(c.tmt) : '',
    'Extintor e manta ignífuga': (seg.indexOf('Extintor') >= 0 && seg.indexOf('Manta ignífuga') >= 0) ? 'Por verificar' : 'Pendente',
    'Kit de primeiros socorros': seg.indexOf('Kit de primeiros socorros') >= 0 ? 'Por verificar' : 'Pendente',
    'Hospitable, Airbnb e Booking ligados': 'Pendente'
  };

  // Notas para a equipa (uma linha legível)
  var notas = [];
  if (c.camas) notas.push('Camas: ' + c.camas);
  notas.push('Ar condicionado: ' + (tem('Ar condicionado') ? (c.acTodos || 'sim') : 'não'));
  notas.push('Piscina: ' + (tem('Piscina') ? (c.piscinaTipo || 'sim') : 'não'));
  notas.push('Churrasqueira: ' + (tem('Churrasqueira') ? 'sim' : 'não'));
  if (c.entrada) notas.push('Entrada: ' + c.entrada + (c.chaves ? ' (' + c.chaves + ' jogos de chaves)' : ''));
  if (c.animais) notas.push('Animais: ' + c.animais);
  if (c.limpeza) notas.push('Limpeza: ' + c.limpeza + (c.limpezaContacto ? ' — ' + c.limpezaContacto : ''));
  if (c.fotos) notas.push('Fotos profissionais: ' + c.fotos);
  notas.push('Airbnb: ' + (c.airbnb === 'Sim' ? (c.airbnbLink || 'tem anúncio') : 'criar'));
  notas.push('Booking: ' + (c.booking === 'Sim' ? (c.bookingId || 'tem anúncio') : 'criar'));
  if (c.usoProprio) notas.push('Uso próprio: ' + c.usoProprio);
  if (c.precoMin) notas.push('Preço mínimo: ' + c.precoMin + ' €');
  if (c.condominio) notas.push('Condomínio: ' + c.condominio);
  r.__obsAloj = notas.join(' · ');
  if (empresa && c.nome) r.__obsProp = 'Representante legal: ' + c.nome;
  if (heranca && c.nome) r.__obsProp = 'Cabeça de casal: ' + c.nome;
  return r;
}

// =====================================================================
// Utilitários
// =====================================================================
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Easy Host')
    .addItem('Criar ficha de onboarding (1.ª vez)', 'criarFichaOnboarding')
    .addItem('Mostrar link da ficha', 'mostrarLinkFicha')
    .addItem('Reprocessar resposta selecionada', 'reprocessarLinhaSelecionada')
    .addToUi();
}

function mostrarLinkFicha() {
  var id = PropertiesService.getDocumentProperties().getProperty('FORM_ID');
  var msg = id ? FormApp.openById(id).getPublishedUrl() : 'A ficha ainda não foi criada. Use "Criar ficha de onboarding".';
  SpreadsheetApp.getUi().alert(msg);
}

/** "8800501" ou "8800 - 501" → "8800-501". Outros formatos ficam como vieram. */
function normCp_(s) {
  var t = String(s || '').replace(/\s/g, '');
  var m = t.match(/^(\d{4})-?(\d{3})$/);
  return m ? m[1] + '-' + m[2] : String(s || '').trim();
}

/** Para comparar textos: sem acentos, minúsculas, espaços simples. */
function normTxt_(s) {
  return String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** "142399/AL" e "142399" contam como o mesmo registo. */
function normRnal_(s) {
  var m = String(s || '').match(/\d{3,}/);
  return m ? m[0] : '';
}

function cabecalhosDe(sh) {
  return sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
}

function colunaDe(sh, cabecalho) {
  var i = cabecalhosDe(sh).indexOf(cabecalho);
  return i < 0 ? 0 : i + 1;
}

function valorEm(sh, linha, cabecalho) {
  var c = colunaDe(sh, cabecalho);
  return c ? sh.getRange(linha, c).getValue() : '';
}

/** Última linha com conteúdo na coluna A (ignora fórmulas que só devolvem ""). */
function ultimaLinha(sh) {
  var n = sh.getLastRow();
  if (n < 2) return 1;
  var a = sh.getRange(2, 1, n - 1, 1).getValues();
  for (var i = a.length - 1; i >= 0; i--) { if (String(a[i][0]).trim() !== '') return i + 2; }
  return 1;
}

function encontrarLinha(sh, cabecalho, teste) {
  var c = colunaDe(sh, cabecalho);
  var n = ultimaLinha(sh);
  if (!c || n < 2) return null;
  var col = sh.getRange(2, c, n - 1, 1).getValues();
  for (var i = 0; i < col.length; i++) { if (teste(col[i][0], i + 2)) return i + 2; }
  return null;
}

function proximoId(sh, cabecalho, prefixo) {
  var c = colunaDe(sh, cabecalho);
  var n = ultimaLinha(sh);
  var max = 0;
  if (c && n >= 2) {
    sh.getRange(2, c, n - 1, 1).getValues().forEach(function (r) {
      var m = String(r[0]).match(/(\d+)\s*$/);
      if (m) max = Math.max(max, parseInt(m[1], 10));
    });
  }
  return prefixo + ('000' + (max + 1)).slice(-3);
}

/** Uma coluna é calculada se o cabeçalho ou a linha 2 tiverem fórmula (ex.: ARRAYFORMULA). */
function colunasCalculadas(sh) {
  var nc = sh.getLastColumn();
  var f1 = sh.getRange(1, 1, 1, nc).getFormulas()[0];
  var f2 = sh.getMaxRows() >= 2 ? sh.getRange(2, 1, 1, nc).getFormulas()[0] : [];
  var out = {};
  for (var i = 0; i < nc; i++) {
    var a = f1[i] || '', b = f2[i] || '';
    if (a || /ARRAYFORMULA|^=\s*\{|MAP\(|BYROW\(/i.test(b)) out[i + 1] = true;
  }
  return out;
}

/**
 * Escreve um objeto {cabeçalho: valor} numa linha.
 * - linha null → nova linha a seguir à última, copiando fórmulas linha-a-linha da linha anterior.
 * - linha existente → só preenche células vazias, exceto os cabeçalhos em `sempre`.
 * Nunca escreve em colunas calculadas.
 */
function escreverLinha(sh, linha, dados, sempre) {
  sempre = sempre || [];
  var cab = cabecalhosDe(sh);
  var calc = colunasCalculadas(sh);
  var nova = !linha;
  if (nova) {
    linha = ultimaLinha(sh) + 1;
    if (linha > sh.getMaxRows()) sh.insertRowsAfter(sh.getMaxRows(), 20);
    var anterior = linha - 1;
    if (anterior >= 2) {
      var formulas = sh.getRange(anterior, 1, 1, cab.length).getFormulasR1C1()[0];
      formulas.forEach(function (f, i) {
        if (f && !calc[i + 1] && !/ARRAYFORMULA/i.test(f) && !(cab[i] in dados)) {
          sh.getRange(linha, i + 1).setFormulaR1C1(f);
        }
      });
    }
  }
  cab.forEach(function (h, i) {
    if (!(h in dados)) return;
    var col = i + 1;
    if (calc[col]) return;
    var val = dados[h];
    if (val === '' || val === null || val === undefined) return;
    var cel = sh.getRange(linha, col);
    if (!nova && sempre.indexOf(h) < 0) {
      if (String(cel.getValue()).trim() !== '' || cel.getFormula()) return;
    }
    cel.setValue(val);
  });
  return linha;
}

// ----- Construtores de perguntas -----
function sec(form, titulo, ajuda) { form.addPageBreakItem().setTitle(titulo).setHelpText(ajuda || ''); }
function txt(form, t, req) { return form.addTextItem().setTitle(t).setRequired(!!req); }
function para(form, t, req) { return form.addParagraphTextItem().setTitle(t).setRequired(!!req); }
function data(form, t, req) { return form.addDateItem().setTitle(t).setRequired(!!req); }
function mc(form, t, ops, req) { return form.addMultipleChoiceItem().setTitle(t).setChoiceValues(ops).setRequired(!!req); }
function mcOutro(form, t, ops, req) {
  return form.addMultipleChoiceItem().setTitle(t).setChoiceValues(ops).showOtherOption(true).setRequired(!!req);
}
function cb(form, t, ops, req) { return form.addCheckboxItem().setTitle(t).setChoiceValues(ops).setRequired(!!req); }
function num(form, t, req) {
  var it = form.addTextItem().setTitle(t).setRequired(!!req);
  it.setValidation(FormApp.createTextValidation().requireNumber().setHelpText('Indique só um número / Numbers only').build());
  return it;
}
function txtPadrao(form, t, req, padrao, ajuda) {
  var it = form.addTextItem().setTitle(t).setRequired(!!req);
  it.setValidation(FormApp.createTextValidation().requireTextMatchesPattern(padrao).setHelpText(ajuda).build());
  return it;
}
