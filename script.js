// --- ESTADO GLOBAL DA APLICAÇÃO ---
let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado')) || null;
let tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
let idEdicaoEmAndamento = null;

// --- ROTEADOR SIMPLES (Troca de Seções) ---
function navegarPara(idSecao) {
    // Bloqueio de segurança exigido: Não deixa entrar nas tarefas se deslogado
    if (idSecao === 'sec-tarefas' && !usuarioLogado) {
        alert('Acesso negado! Por favor, faça login primeiro.');
        navegarPara('sec-login');
        return;
    }

    // Gerencia classe ativa das seções
    document.querySelectorAll('.app-section').forEach(sec => {
        sec.classList.remove('id-active');
    });
    document.getElementById(idSecao).classList.add('id-active');

    // Controla estilo ativo no menu lateral
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.classList.remove('active');
        if(link.getAttribute('onclick')?.includes(idSecao)) {
            link.classList.add('active');
        }
    });

    if (idSecao === 'sec-tarefas') {
        renderizarTabelaTarefas();
    }
}

// --- CONTROLE DE MENUS E LOGIN ---
function renderizarMenu() {
    const menuContainer = document.getElementById('menu-links');
    
    if (usuarioLogado) {
        // Menu completo para usuários logados
        menuContainer.innerHTML = `
            <a href="#" onclick="navegarPara('sec-home')">🏠 Home</a>
            <a href="#" onclick="navegarPara('sec-tarefas')">📋 Gerenciar Tarefas</a>
            <button onclick="efeituarLogout()">🚪 Sair (${usuarioLogado.user})</button>
        `;
    } else {
        // Menu restrito para deslogados
        menuContainer.innerHTML = `
            <a href="#" onclick="navegarPara('sec-home')">🏠 Home</a>
            <a href="#" onclick="navegarPara('sec-login')">🔑 Login / Cadastro</a>
        `;
    }
}

// Cadastro de novos Usuários
document.getElementById('form-cadastro-user').addEventListener('submit', function(e) {
    e.preventDefault();
    const userIn = document.getElementById('cad-user').value.trim();
    const passIn = document.getElementById('cad-pass').value;

    if (usuarios.some(u => u.user.toLowerCase() === userIn.toLowerCase())) {
        alert('Este nome de usuário já existe!');
        return;
    }

    usuarios.push({ user: userIn, pass: passIn });
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    alert('Usuário cadastrado com sucesso! Faça login.');
    this.reset();
});

// Execução de Login
document.getElementById('form-login').addEventListener('submit', function(e) {
    e.preventDefault();
    const userIn = document.getElementById('login-user').value.trim();
    const passIn = document.getElementById('login-pass').value;

    const contaValida = usuarios.find(u => u.user.toLowerCase() === userIn.toLowerCase() && u.pass === passIn);

    if (contaValida) {
        usuarioLogado = contaValida;
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado));
        renderizarMenu();
        this.reset();
        navegarPara('sec-tarefas'); // Edital: Leva para a tela de listagem
    } else {
        alert('Usuário ou senha incorretos.');
    }
});

function efeituarLogout() {
    usuarioLogado = null;
    localStorage.removeItem('usuarioLogado');
    renderizarMenu();
    navegarPara('sec-home');
}

// --- CONTROLADORES DO FORMULÁRIO POPUP ---
function mostrarFormularioCadastro() {
    document.getElementById('container-form-tarefa').classList.remove('hidden');
    document.getElementById('form-titulo').innerText = "Cadastrar Nova Tarefa";
    idEdicaoEmAndamento = null;
}

function fecharFormularioCadastro() {
    document.getElementById('container-form-tarefa').classList.add('hidden');
    document.getElementById('form-tarefa').reset();
    idEdicaoEmAndamento = null;
}

// --- LÓGICA DO CRUD DE TAREFAS ---

// Salvar / Editar Registro
document.getElementById('form-tarefa').addEventListener('submit', function(e) {
    e.preventDefault();

    const nomeTarefa = document.getElementById('txt-tarefa').value.trim();
    const prioridade = document.getElementById('sel-prioridade').value;
    const descricao = document.getElementById('txt-descricao').value.trim();

    // Validação Obrigatória: Impedir nomes idênticos
    const duplicado = tarefas.some(t => t.nome.toLowerCase() === nomeTarefa.toLowerCase() && t.id !== idEdicaoEmAndamento);
    if (duplicado) {
        alert('Erro: Já existe uma tarefa cadastrada com esse nome exato!');
        return;
    }

    if (idEdicaoEmAndamento === null) {
        // Operação: CREATE
        const novaTarefa = {
            id: Date.now(),
            nome: nomeTarefa,
            prioridade: prioridade,
            descricao: descricao // Pode ir vazia
        };
        tarefas.push(novaTarefa);
    } else {
        // Operação: UPDATE
        tarefas = tarefas.map(t => t.id === idEdicaoEmAndamento ? { ...t, nome: nomeTarefa, prioridade: prioridade, descricao: descricao } : t);
    }

    localStorage.setItem('tarefas', JSON.stringify(tarefas));
    fecharFormularioCadastro();
    renderizarTabelaTarefas();
});

// Operação: READ (Listar e Filtrar)
function renderizarTabelaTarefas(filtro = "") {
    const tbody = document.getElementById('tabela-tarefas-body');
    tbody.innerHTML = "";

    // Filtra tarefas com base no input de busca
    const tarefasFiltradas = tarefas.filter(t => t.nome.toLowerCase().includes(filtro.toLowerCase()));

    if(tarefasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Nenhuma tarefa encontrada.</td></tr>`;
        return;
    }

    tarefasFiltradas.forEach(t => {
        // Regra de Negócio: Exibir "N/A" se o campo opcional estiver vazio
        const descExibicao = t.descricao ? t.descricao : "N/A";

        tbody.innerHTML += `
            <tr>
                <td><strong>${t.nome}</strong></td>
                <td>${t.prioridade}</td>
                <td>${descExibicao}</td>
                <td>
                    <button onclick="carregarDadosParaEdicao(${t.id})">✏️ Editar</button>
                    <button onclick="deletarTarefa(${t.id})">🗑️ Excluir</button>
                </td>
            </tr>
        `;
    });
}

// Preparação para UPDATE
function carregarDadosParaEdicao(id) {
    const tarefaParaEditar = tarefas.find(t => t.id === id);
    if (!tarefaParaEditar) return;

    idEdicaoEmAndamento = id;
    
    document.getElementById('txt-tarefa').value = tarefaParaEditar.nome;
    document.getElementById('sel-prioridade').value = tarefaParaEditar.prioridade;
    document.getElementById('txt-descricao').value = tarefaParaEditar.descricao;

    document.getElementById('form-titulo').innerText = "✏️ Editando Tarefa";
    document.getElementById('container-form-tarefa').classList.remove('hidden');
    
    // Rola a página suavemente até o formulário de edição
    document.getElementById('container-form-tarefa').scrollIntoView({ behavior: 'smooth' });
}

// Operação: DELETE
function deletarTarefa(id) {
    if (confirm("Tem certeza absoluta de que deseja remover esta tarefa?")) {
        tarefas = tarefas.filter(t => t.id !== id);
        localStorage.setItem('tarefas', JSON.stringify(tarefas));
        renderizarTabelaTarefas(document.getElementById('campo-busca').value);
    }
}

// Gatilho do Campo de Busca (Filtro Dinâmico)
document.getElementById('campo-busca').addEventListener('input', function(e) {
    renderizarTabelaTarefas(e.target.value);
});

// --- INICIALIZAÇÃO DO APP ---
document.addEventListener('DOMContentLoaded', () => {
    renderizarMenu();
    navegarPara('sec-home'); // Sempre inicia na Home
})
