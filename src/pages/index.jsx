import Layout from "./Layout.jsx";
import Assinantes from "./Assinantes";
import Assinar from "./Assinar";
import Cadastro from "./Cadastro";
import Login from "./Login";
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
import PainelAssinante from "./PainelAssinante";
import RastreioCliente from "./RastreioCliente";
import Cardapio from "./Cardapio";
import Admin from "./Admin";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import { BrowserRouter as Router, Route, Routes, useLocation, Navigate } from 'react-router-dom';

const PAGES = {
    
    Assinantes: Assinantes,
    
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
                <Route path="/s/:slug" element={<Cardapio />} />
                <Route path="/" element={<Cardapio />} />
                <Route path="/Assinantes" element={<ProtectedRoute requireMaster><Assinantes /></ProtectedRoute>} />
                
                <Route path="/Assinar" element={<Assinar />} />
                
                <Route path="/Cadastro" element={<Cadastro />} />
                
                <Route path="/login" element={<Login />} />
                <Route path="/Login" element={<Navigate to="/login" replace />} />
                <Route path="/cadastro-cliente" element={<CadastroCliente />} />
                <Route path="/definir-senha" element={<DefinirSenha />} />
                <Route path="/setup-password" element={<DefinirSenha />} />
                <Route path="/esqueci-senha" element={<EsqueciSenha />} />
                <Route path="/redefinir-senha" element={<RedefinirSenha />} />
                <Route path="/ajuda" element={<Ajuda />} />
                
                <Route path="/Entregador" element={<ProtectedRoute requireActiveSubscription><Entregador /></ProtectedRoute>} />
                <Route path="/EntregadorPanel" element={<ProtectedRoute requireActiveSubscription><EntregadorPanel /></ProtectedRoute>} />
                <Route path="/GestorPedidos" element={<ProtectedRoute requireActiveSubscription><GestorPedidos /></ProtectedRoute>} />
                <Route path="/Home" element={<Home />} />
                <Route path="/MeusPedidos" element={<MeusPedidos />} />
                <Route path="/PDV" element={<ProtectedRoute requireActiveSubscription><PDV /></ProtectedRoute>} />
                <Route path="/Cozinha" element={<ProtectedRoute requireActiveSubscription><Cozinha /></ProtectedRoute>} />
                <Route path="/PainelAssinante" element={<ProtectedRoute requireActiveSubscription><PainelAssinante /></ProtectedRoute>} />
                <Route path="/RastreioCliente" element={<RastreioCliente />} />
                <Route path="/Cardapio" element={<Cardapio />} />
                <Route path="/Admin" element={<ProtectedRoute requireMaster><Admin /></ProtectedRoute>} />
                
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