/**
 * Stress Test - Criação de Pedidos Simultâneos
 * 
 * Testa a capacidade do sistema de lidar com múltiplas requisições simultâneas
 * sem gerar erros 500, inconsistências de status ou pedidos duplicados.
 */

// Usar fetch nativo do Node.js 18+ ou import dinâmico
const fetch = globalThis.fetch || (await import('node-fetch')).default;
import dotenv from 'dotenv';

dotenv.config();

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3000';
const TEST_SLUG = process.env.TEST_SLUG || 'test-slug';
const CONCURRENT_REQUESTS = 50;

/**
 * Cria um pedido
 */
async function createOrder(orderNumber) {
  const orderData = {
    slug: TEST_SLUG,
    table_number: orderNumber,
    items: [
      { dish_id: 1, quantity: 1, price: 10.00 }
    ],
    total: 10.00,
    customer_name: `Cliente ${orderNumber}`,
    customer_phone: '11999999999'
  };

  try {
    const response = await fetch(`${BACKEND_URL}/api/public/pedido-mesa`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(orderData)
    });

    const data = await response.json();

    return {
      success: response.ok,
      status: response.status,
      orderNumber,
      data: response.ok ? data : { error: data.error },
      orderCode: data.order_code || null
    };
  } catch (error) {
    return {
      success: false,
      status: 0,
      orderNumber,
      error: error.message,
      orderCode: null
    };
  }
}

/**
 * Executa stress test
 */
async function runStressTest() {
  const fetch = await getFetch();
  console.log('🚀 Iniciando Stress Test...');
  console.log(`📊 Requisições simultâneas: ${CONCURRENT_REQUESTS}`);
  console.log(`🔗 Backend URL: ${BACKEND_URL}`);
  console.log(`🏪 Slug de teste: ${TEST_SLUG}`);
  console.log('');

  const startTime = Date.now();
  const promises = [];

  // Criar todas as requisições simultaneamente
  for (let i = 1; i <= CONCURRENT_REQUESTS; i++) {
    promises.push(createOrder(i));
  }

  // Aguardar todas as requisições
  const results = await Promise.all(promises);
  const endTime = Date.now();
  const duration = endTime - startTime;

  // Analisar resultados
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);
  const errors500 = results.filter(r => r.status === 500);
  const errors400 = results.filter(r => r.status === 400);
  const errors403 = results.filter(r => r.status === 403);
  const errors404 = results.filter(r => r.status === 404);

  // Verificar duplicatas (mesmo order_code)
  const orderCodes = successful.map(r => r.orderCode).filter(Boolean);
  const uniqueOrderCodes = new Set(orderCodes);
  const duplicates = orderCodes.length - uniqueOrderCodes.size;

  // Verificar status inconsistentes
  const statuses = successful.map(r => r.data?.status).filter(Boolean);
  const invalidStatuses = statuses.filter(s => 
    !['new', 'pending', 'accepted', 'preparing', 'ready', 'delivering', 'delivered', 'cancelled'].includes(s)
  );

  // Relatório
  console.log('📊 RESULTADOS DO STRESS TEST');
  console.log('='.repeat(50));
  console.log(`⏱️  Tempo total: ${duration}ms`);
  console.log(`✅ Sucessos: ${successful.length}/${CONCURRENT_REQUESTS}`);
  console.log(`❌ Falhas: ${failed.length}/${CONCURRENT_REQUESTS}`);
  console.log('');

  if (errors500.length > 0) {
    console.log(`🚨 ERROS 500: ${errors500.length}`);
    errors500.forEach(err => {
      console.log(`   - Pedido ${err.orderNumber}: ${err.error || 'Erro interno'}`);
    });
    console.log('');
  }

  if (errors400.length > 0) {
    console.log(`⚠️  ERROS 400: ${errors400.length}`);
    errors400.forEach(err => {
      console.log(`   - Pedido ${err.orderNumber}: ${err.data?.error || 'Bad Request'}`);
    });
    console.log('');
  }

  if (errors403.length > 0) {
    console.log(`🔒 ERROS 403: ${errors403.length}`);
    errors403.forEach(err => {
      console.log(`   - Pedido ${err.orderNumber}: ${err.data?.error || 'Forbidden'}`);
    });
    console.log('');
  }

  if (errors404.length > 0) {
    console.log(`🔍 ERROS 404: ${errors404.length}`);
    errors404.forEach(err => {
      console.log(`   - Pedido ${err.orderNumber}: ${err.data?.error || 'Not Found'}`);
    });
    console.log('');
  }

  if (duplicates > 0) {
    console.log(`⚠️  PEDIDOS DUPLICADOS: ${duplicates}`);
    console.log('');
  }

  if (invalidStatuses.length > 0) {
    console.log(`🚨 STATUS INCONSISTENTES: ${invalidStatuses.length}`);
    invalidStatuses.forEach(status => {
      console.log(`   - Status inválido: ${status}`);
    });
    console.log('');
  }

  // Critérios de sucesso
  console.log('✅ CRITÉRIOS DE SUCESSO');
  console.log('='.repeat(50));
  const criteria = {
    no500Errors: errors500.length === 0,
    noDuplicates: duplicates === 0,
    noInvalidStatuses: invalidStatuses.length === 0,
    allRequestsProcessed: results.length === CONCURRENT_REQUESTS
  };

  Object.entries(criteria).forEach(([criterion, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${criterion}: ${passed ? 'PASSOU' : 'FALHOU'}`);
  });

  console.log('');

  // Resultado final
  const allPassed = Object.values(criteria).every(v => v);
  
  if (allPassed) {
    console.log('🎉 STRESS TEST PASSOU! Sistema está pronto para produção.');
    process.exit(0);
  } else {
    console.log('⚠️  STRESS TEST FALHOU! Corrija os problemas antes de liberar.');
    process.exit(1);
  }
}

// Executar
runStressTest().catch(error => {
  console.error('❌ Erro ao executar stress test:', error);
  process.exit(1);
});
