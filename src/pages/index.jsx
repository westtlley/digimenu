import Layout from "./Layout.jsx";

import Assinantes from "./Assinantes";

import Assinar from "./Assinar";

import Cadastro from "./Cadastro";

import Login from "./Login";

import CadastroCliente from "./CadastroCliente";

import DefinirSenha from "./DefinirSenha";

import Entregador from "./Entregador";

import EntregadorPanel from "./EntregadorPanel";

import GestorPedidos from "./GestorPedidos";

import Home from "./Home";

import MeusPedidos from "./MeusPedidos";

import PDV from "./PDV";

import PainelAssinante from "./PainelAssinante";

import RastreioCliente from "./RastreioCliente";

import Cardapio from "./Cardapio";

import Admin from "./Admin";

import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';

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
                
                    <Route path="/" element={<Cardapio />} />
                
                
                <Route path="/Assinantes" element={<Assinantes />} />
                
                <Route path="/Assinar" element={<Assinar />} />
                
                <Route path="/Cadastro" element={<Cadastro />} />
                
                {/* Rota de login */}
                        <Route path="/login" element={<Login />} />
                        <Route path="/cadastro-cliente" element={<CadastroCliente />} />
                        <Route path="/definir-senha" element={<DefinirSenha />} />
                        <Route path="/setup-password" element={<DefinirSenha />} />
                <Route path="/Login" element={<Login />} />
                
                <Route path="/Entregador" element={<Entregador />} />
                
                <Route path="/EntregadorPanel" element={<EntregadorPanel />} />
                
                <Route path="/GestorPedidos" element={<GestorPedidos />} />
                
                <Route path="/Home" element={<Home />} />
                
                <Route path="/MeusPedidos" element={<MeusPedidos />} />
                
                <Route path="/PDV" element={<PDV />} />
                
                <Route path="/PainelAssinante" element={<PainelAssinante />} />
                
                <Route path="/RastreioCliente" element={<RastreioCliente />} />
                
                <Route path="/Cardapio" element={<Cardapio />} />
                
                <Route path="/Admin" element={<Admin />} />
                
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