/**
 * Conteúdo da área "Dicas e atalhos" do Gestor de Pedidos
 * Inspirado em gp-home-contents do iFood: cards com título, descrição, link, cor.
 */

export const gestorHomeContents = [
  {
    id: 'atalhos',
    title: 'Atalhos de teclado',
    description: '1–4: mudar status no pedido aberto. Ctrl+F: buscar. Esc: fechar.',
    backgroundColor: '#f97316',
    contentFontColor: '#ffffff',
    internalRoute: null,
    externalUrl: null,
    order: 1,
  },
  {
    id: 'cancelar',
    title: 'Como cancelar um pedido',
    description: 'Abra o pedido, Rejeitar, escolha o motivo e confirme. Só em status Novo ou Aceito.',
    backgroundColor: '#7C609B',
    contentFontColor: '#ffffff',
    internalRoute: null,
    externalUrl: null,
    order: 2,
  },
  {
    id: 'comandas',
    title: 'Impressão de comandas',
    description: 'Use "Imprimir" no pedido ou "Na fila" e depois "Imprimir X comanda(s)" no botão flutuante.',
    backgroundColor: '#059669',
    contentFontColor: '#ffffff',
    internalRoute: null,
    externalUrl: null,
    order: 3,
  },
  {
    id: 'notificacoes',
    title: 'Notificações',
    description: 'Em Ajustes → Notificações: escolha o som, volume e em quais status deseja ser avisado.',
    backgroundColor: '#2563eb',
    contentFontColor: '#ffffff',
    internalRoute: 'settings',
    externalUrl: null,
    order: 4,
  },
  {
    id: 'tempo-preparo',
    title: 'Tempo de preparo',
    description: 'Tempo padrão em Ajustes. Ao aceitar, você pode alterar por pedido. O sistema sugere pela média.',
    backgroundColor: '#c2410c',
    contentFontColor: '#ffffff',
    internalRoute: 'settings',
    externalUrl: null,
    order: 5,
  },
];
