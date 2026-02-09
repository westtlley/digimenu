import Layout from "./Layout.jsx";
import Assinantes from "./Assinantes";
import AdminMasterDashboard from "./AdminMasterDashboard";
import Assinar from "./Assinar";
import Cadastro from "./Cadastro";
import Login from "./Login";
import LoginCliente from "./auth/LoginCliente";
import LoginAssinante from "./auth/LoginAssinante";
import LoginAdmin from "./auth/LoginAdmin";
import LoginColaborador from "./auth/LoginColaborador";
import LoginBySlug from "./auth/LoginBySlug";
import ColaboradorHome from "./ColaboradorHome";
import GoogleCallback from "./auth/GoogleCallback";
import CadastroCliente from "./CadastroCliente";
import DefinirSenha from "./DefinirSenha";
import EsqueciSenha from "./EsqueciSenha";
import RedefinirSenha from "./RedefinirSenha";
import Ajuda from "./Ajuda";
import Entregador from "./Entregador";
import EntregadorPanel from "./EntregadorPanel";
import GestorPedidos from "./GestorPedidos";
import Home from "./Home";
import MeusPedidos from "./MeusPedidos";
import PDV from "./PDV";
import Cozinha from "./Cozinha";
import Garcom from "./Garcom";
import PainelAssinante from "./PainelAssinante";
import PainelGerente from "./PainelGerente";
import RastreioCliente from "./RastreioCliente";
import TrackOrder from "./TrackOrder";
import Cardapio from "./Cardapio";
import Admin from "./Admin";
import TableOrder from "./TableOrder";
import PagamentoSucesso from "./pagamento/PagamentoSucesso";
import PagamentoFalha from "./pagamento/PagamentoFalha";
import PagamentoPendente from "./pagamento/PagamentoPendente";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import SmartRedirect from "../components/auth/SmartRedirect";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

const PAGES = {
    
    Assinantes: Assinantes,
    
    AdminMasterDashboard: AdminMasterDashboard,
    
    Assinar: Assinar,
    
    Cadastro: Cadastro,
    
    Login: Login,
    
    CadastroCliente: CadastroCliente,
    
    Entregador: Entregador,
    
    EntregadorPanel: EntregadorPanel,
    
    GestorPedidos: GestorPedidos,
    
    Home: Home,
    
    MeusPedidos: MeusPedidos,
    
    PDV: PDV,
    
    Garcom: Garcom,
    
    PainelAssinante: PainelAssinante,
    
    RastreioCliente: RastreioCliente,
    
    Cardapio: Cardapio,
    
    Admin: Admin,
    
}

function _getCurrentPage(url) {
    if (url.endsWith('/')) {
        url = url.slice(0, -1);
    }
    let urlLastPart = url.split('/').pop();
    if (urlLastPart.includes('?')) {
        urlLastPart = urlLastPart.split('?')[0];
    }

    const pageName = Object.keys(PAGES).find(page => page.toLowerCase() === urlLastPart.toLowerCase());
    return pageName || 'Cardapio';
}

// Create a wrapper component that uses useLocation inside the Router context
function PagesContent() {
    const location = useLocation();
    const currentPage = _getCurrentPage(location.pathname);
    
    return (
        <Layout currentPageName={currentPage}>
            <Routes>
                {/* Link único por assinante: /s/meu-restaurante — cardápio público sem login */}
                {/* Páginas do assinante sob o link: /s/raiz-maranhense/GestorPedidos, etc. */}
                <Route path="/s/:slug/GestorPedidos" element={<ProtectedRoute requireActiveSubscription><GestorPedidos /></ProtectedRoute>} />
                <Route path="/s/:slug/PainelAssinante" element={<ProtectedRoute requireActiveSubscription><PainelAssinante /></ProtectedRoute>} />
                <Route path="/s/:slug/Cozinha" element={<ProtectedRoute requireActiveSubscription><Cozinha /></ProtectedRoute>} />
                <Route path="/s/:slug/PDV" element={<ProtectedRoute requireActiveSubscription><PDV /></ProtectedRoute>} />
                <Route path="/s/:slug/Entregador" element={<ProtectedRoute requireActiveSubscription><Entregador /></ProtectedRoute>} />
                <Route path="/s/:slug/EntregadorPanel" element={<ProtectedRoute requireActiveSubscription><EntregadorPanel /></ProtectedRoute>} />
                <Route path="/s/:slug/Garcom" element={<ProtectedRoute requireActiveSubscription><Garcom /></ProtectedRoute>} />
                {/* Login unificado: /s/:slug/login (dono, gerente, colaborador, cliente). Atalhos: /s/:slug/login/cliente e /s/:slug/login/colaborador */}
                <Route path="/s/:slug/login/:type" element={<LoginBySlug />} />
                <Route path="/s/:slug/login" element={<LoginBySlug />} />
                <Route path="/s/:slug" element={<Cardapio />} />
                
                {/* GOVERNANÇA DE REDIRECIONAMENTOS: SmartRedirect decide baseado no perfil do usuário */}
                <Route path="/" element={<SmartRedirect />} />
                <Route path="/cardapio" element={<SmartRedirect />} />
                <Route path="/Cardapio" element={<SmartRedirect />} />
                
                <Route path="/Assinantes" element={<ProtectedRoute requireMaster><Assinantes /></ProtectedRoute>} />
                <Route path="/AdminMasterDashboard" element={<ProtectedRoute requireMaster><AdminMasterDashboard /></ProtectedRoute>} />
                
                <Route path="/Assinar" element={<Assinar />} />
                
                <Route path="/Cadastro" element={<Cadastro />} />
                
                {/* Rastreamento público de pedidos */}
                <Route path="/rastrear-pedido" element={<TrackOrder />} />
                <Route path="/track-order" element={<TrackOrder />} />
                
                {/* Pedido por mesa (QR Code) */}
                <Route path="/mesa/:tableNumber" element={<TableOrder />} />
                
                {/* Logins genéricos desativados: redirecionam para / (uso dos logins por slug: /s/:slug/login...) */}
                <Route path="/login/cliente" element={<Navigate to="/" replace />} />
                <Route path="/login/assinante" element={<Navigate to="/" replace />} />
                <Route path="/login/colaborador" element={<Navigate to="/" replace />} />
                <Route path="/login/admin" element={<LoginAdmin />} />
                <Route path="/colaborador" element={<ColaboradorHome />} />
                
                {/* /login e /assinante: redirecionam para início (acesso pelo link do estabelecimento) */}
                <Route path="/login" element={<Navigate to="/" replace />} />
                <Route path="/Login" element={<Navigate to="/" replace />} />
                <Route path="/assinante" element={<Navigate to="/" replace />} />
                <Route path="/cadastro-cliente" element={<CadastroCliente />} />
                <Route path="/cadastro/cliente" element={<CadastroCliente />} />
                {/* Cadastro de cliente vinculado ao restaurante (slug) */}
                <Route path="/s/:slug/cadastro-cliente" element={<CadastroCliente />} />
                <Route path="/definir-senha" element={<DefinirSenha />} />
                <Route path="/setup-password" element={<DefinirSenha />} />
                <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                <Route path="/reset-password" element={<RedefinirSenha />} />
                <Route path="/ajuda" element={<Ajuda />} />
                
                {/* Callback do Google OAuth */}
                <Route path="/auth/callback" element={<GoogleCallback />} />
                <Route path="/auth/google/callback" element={<GoogleCallback />} />
                
                <Route path="/Entregador" element={<ProtectedRoute requireActiveSubscription><Entregador /></ProtectedRoute>} />
                <Route path="/EntregadorPanel" element={<ProtectedRoute requireActiveSubscription><EntregadorPanel /></ProtectedRoute>} />
                <Route path="/GestorPedidos" element={<ProtectedRoute requireActiveSubscription><GestorPedidos /></ProtectedRoute>} />
                <Route path="/Home" element={<Home />} />
                <Route path="/MeusPedidos" element={<MeusPedidos />} />
                <Route path="/PDV" element={<ProtectedRoute requireActiveSubscription><PDV /></ProtectedRoute>} />
                <Route path="/Cozinha" element={<ProtectedRoute requireActiveSubscription><Cozinha /></ProtectedRoute>} />
                <Route path="/Garcom" element={<ProtectedRoute requireActiveSubscription><Garcom /></ProtectedRoute>} />
                <Route path="/PainelAssinante" element={<ProtectedRoute requireActiveSubscription><PainelAssinante /></ProtectedRoute>} />
                <Route path="/PainelGerente" element={<ProtectedRoute><PainelGerente /></ProtectedRoute>} />
                <Route path="/RastreioCliente" element={<RastreioCliente />} />
                <Route path="/Admin" element={<ProtectedRoute requireMaster><Admin /></ProtectedRoute>} />
                
                {/* Páginas de callback de pagamento */}
                <Route path="/pagamento/sucesso" element={<PagamentoSucesso />} />
                <Route path="/pagamento/falha" element={<PagamentoFalha />} />
                <Route path="/pagamento/pendente" element={<PagamentoPendente />} />
                
            </Routes>
        </Layout>
    );
}

export default function Pages() {
    return (
        <Router>
            <PagesContent />
        </Router>
    );
}