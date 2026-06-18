// ==========================================================================
// 1. ESTADO GLOBAL E RECUPERAÇÃO DE DADOS (ARMÁRIO DE MEMÓRIA)
// ==========================================================================

// Tenta buscar os dados salvos. Se não existirem, inicia como uma lista vazia [] ou nulo
let usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
let usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado')) || null;
let tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
let idEdicaoEmAndamento = null; // Guarda o ID da tarefa que estamos editando (se houver)

// ==========================================================================
// 2. ROTEADOR DE TELAS (SEGURANÇA E NAVEGAÇÃO)
// ==========================================================================

function navegarPara(idSecao) {
    // BLINDAGEM DE SEGURANÇA: Se tentar ir para o CRUD sem estar logado, barra a entrada
    if (idSecao === 'sec-tarefas' && !usuarioLogado) {
        alert('Acesso negado! Por favor, faça login primeiro para acessar o gerenciador.');
        navegarPara('sec-login');
        return;
    }

    // Esconde todas as salas removendo a classe ativa
    document.querySelectorAll('.app-section').forEach(sec => {
        sec.classList.remove('id-active');
    });
    
    // Mostra apenas a sala desejada adicionando a classe ativa
    const secaoAlvo = document.getElementById(idSecao);
    if (secaoAlvo) {
        secaoAlvo.classList.add('id-active');
    }

    // Atualiza o visual dos botões do menu lateral para mostrar onde o usuário está
    document.querySelectorAll('.sidebar nav a').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('onclick')?.includes(`'${idSecao}'`)) {
            link.classList.add('active');
        }
    });

    // Se a sala ativada for a de tarefas, força o redesenho da tabela atualizada
    if (idSecao === 'sec-tarefas') {
        renderizarTabelaTarefas();
    }
}

// Renders dinamicamente o menu lateral baseado no status de login
function renderizarMenu() {
    const menuContainer = document.getElementById('menu-links');
    if (!menuContainer) return;
    
    if (usuarioLogado) {
        // Usuário Logado: Libera acesso à Home, CRUD e botão Sair
        menuContainer.innerHTML = `
            <a href="#" onclick="navegarPara('sec-home')">🏠 Home</a>
            <a href="#" onclick="navegarPara('sec-tarefas')">📋 Gerenciar Tarefas</a>
            <button onclick="efeituarLogout()" style="margin-top: auto;">🚪 Sair (${usuarioLogado.user})</button>
        `;
    } else {
        // Usuário Deslogado: Só mostra Home e Login
        menuContainer.innerHTML = `
            <a href="#" onclick="navegarPara('sec-home')">🏠 Home</a>
            <a href="#" onclick="navegarPara('sec-login')">🔑 Login / Cadastro</a>
        `;
    }
}

// ==========================================================================
// 3. CONTROLE DE ACESSO (CADASTRO DE USUÁRIO E LOGIN BLINDADOS)
// ==========================================================================

// Evento de Cadastro de Conta
document.getElementById('form-cadastro-user').addEventListener('submit', function(e) {
    e.preventDefault(); // Impede a página de recarregar
    
    // BLINDAGEM 1: Captura os dados e remove espaços inúteis digitados por erro (.trim())
    const userIn = document.getElementById('cad-user').value.trim();
    const passIn = document.getElementById('cad-pass').value.trim();

    if (!userIn || !passIn) {
        alert('Por favor, preencha todos os campos corretamente.');
        return;
    }

    // Força atualização da lista lendo diretamente do armário antes de validar
    usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];

    // BLINDAGEM 2: Verifica se o usuário já existe ignorando maiúsculas/minúsculas (.toLowerCase())
    const usuarioJaExiste = usuarios.some(u => u.user.toLowerCase() === userIn.toLowerCase());
    if (usuarioJaExiste) {
        alert('Erro: Este nome de usuário já está sendo utilizado por outra pessoa!');
        return;
    }

    // Adiciona o novo usuário na lista e salva em formato de texto (JSON)
    usuarios.push({ user: userIn, pass: passIn });
    localStorage.setItem('usuarios', JSON.stringify(usuarios));
    
    alert('Conta criada com sucesso! Agora você já pode fazer login.');
    this.reset(); // Limpa as caixas de texto do formulário
});

// Evento de Login
document.getElementById('form-login').addEventListener('submit', function(e) {
    e.preventDefault();
    
    // BLINDAGEM 1: Captura limpando espaços extras
    const userIn = document.getElementById('login-user').value.trim();
    const passIn = document.getElementById('login-pass').value.trim();

    // Força atualização da lista lendo diretamente do armário
    usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    // BLINDAGEM 2: Procura o usuário ignorando maiúsculas e minúsculas no nome
    const contaValida = usuarios.find(u => u.user.toLowerCase() === userIn.toLowerCase() && u.pass === passIn);

    if (contaValida) {
        usuarioLogado = contaValida;
        localStorage.setItem('usuarioLogado', JSON.stringify(usuarioLogado)); // Salva estado ativo
        renderizarMenu();
        this.reset();
        navegarPara('sec-tarefas'); // Edital: Direciona automaticamente para a tela de listagem
    } else {
        alert('Erro: Usuário ou senha incorretos / Conta inexistente.');
    }
});

// Evento de Logout (Sair)
function efeituarLogout() {
    usuarioLogado = null;
    localStorage.removeItem('usuarioLogado'); // Remove apenas o login, mantém cadastros intactos
    renderizarMenu();
    navegarPara('sec-home');
}

// ==========================================================================
// 4. GERENCIADOR DE FORMULÁRIOS POP-UP (CRUD)
// ==========================================================================

function mostrarFormularioCadastro() {
    document.getElementById('container-form-tarefa').classList.remove('hidden');
    document.getElementById('form-titulo').innerText = "Cadastrar Nova Tarefa";
    idEdicaoEmAndamento = null; // Garante que o estado voltou para "Nova"
}

function fecharFormularioCadastro() {
    document.getElementById('container-form-tarefa').classList.add('hidden');
    document.getElementById('form-tarefa').reset();
    idEdicaoEmAndamento = null;
}

// ==========================================================================
// 5. OPERAÇÕES DO CRUD DE TAREFAS (GRUPO 5)
// ==========================================================================

// Operação: SALVAR (CREATE / UPDATE)
document.getElementById('form-tarefa').addEventListener('submit', function(e) {
    e.preventDefault();

    // Captura os dados limpando espaços
    const nomeTarefa = document.getElementById('txt-tarefa').value.trim();
    const prioridade = document.getElementById('sel-prioridade').value;
    const descricao = document.getElementById('txt-descricao').value.trim();

    if (!nomeTarefa || !prioridade) {
        alert('Por favor, preencha todos os campos obrigatórios (*).');
        return;
    }

    // Força atualização das tarefas lendo do LocalStorage
    tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];

    // BLINDAGEM: Não deixa salvar nomes idênticos (Ignora maiúsculas/minúsculas).
    // O pedaço "t.id !== idEdicaoEmAndamento" serve para ele não se auto-bloquear na hora de editar.
    const nomeDuplicado = tarefas.some(t => t.nome.toLowerCase() === nomeTarefa.toLowerCase() && t.id !== idEdicaoEmAndamento);
    if (nomeDuplicado) {
        alert('Erro: Já existe uma tarefa com esse nome exato cadastrada no sistema!');
        return;
    }

    if (idEdicaoEmAndamento === null) {
        // --- AÇÃO: CREATE (Nova Tarefa) ---
        const novaTarefa = {
            id: Date.now(), // Gera um ID numérico único baseado no relógio do computador
            nome: nomeTarefa,
            prioridade: prioridade,
            descricao: descricao // Pode ir vazia
        };
        tarefas.push(novaTarefa);
    } else {
        // --- AÇÃO: UPDATE (Editar Existente) ---
        tarefas = tarefas.map(t => {
            if (t.id === idEdicaoEmAndamento) {
                return { ...t, nome: nomeTarefa, prioridade: prioridade, descricao: descricao };
            }
            return t;
        });
    }

    // Salva a lista de tarefas atualizada de volta no armário
    localStorage.setItem('tarefas', JSON.stringify(tarefas));
    fecharFormularioCadastro();
    renderizarTabelaTarefas();
});

// Operação: READ (Listar na Tabela + Filtrar Busca)
function renderizarTabelaTarefas(filtroText = "") {
    const tbody = document.getElementById('tabela-tarefas-body');
    if (!tbody) return;
    
    tbody.innerHTML = "";

    // Sincroniza a leitura com o LocalStorage
    tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];

    // Filtra as tarefas de forma dinâmica com base no que foi digitado na busca
    const tarefasFiltradas = tarefas.filter(t => t.nome.toLowerCase().includes(filtroText.toLowerCase()));

    // Se a tabela estiver vazia, põe um aviso bonito
    if (tarefasFiltradas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; color:#94a3b8;">Nenhuma tarefa registrada ou encontrada.</td></tr>`;
        return;
    }

    // Percorre cada tarefa gerando as linhas do HTML
    tarefasFiltradas.forEach(t => {
        // REGRA DO EDITAL: Se o campo opcional estiver vazio, exibe "N/A"
        const descricaoExibida = t.descricao ? t.descricao : "N/A";

        tbody.innerHTML += `
            <tr>
                <td><strong>${t.nome}</strong></td>
                <td>${t.prioridade}</td>
                <td>${descricaoExibida}</td>
                <td>
                    <button onclick="prepararEdicaoTarefa(${t.id})">✏️ Editar</button>
                    <button onclick="deletarTarefa(${t.id})">🗑️ Excluir</button>
                </td>
            </tr>
        `;
    });
}

// Auxiliar do UPDATE: Puxa os dados antigos de volta para as caixinhas de entrada
function prepararEdicaoTarefa(id) {
    tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
    const tarefaAchada = tarefas.find(t => t.id === id);
    if (!tarefaAchada) return;

    idEdicaoEmAndamento = id; // Trava o ID no modo Edição

    // Preenche os inputs com os dados guardados
    document.getElementById('txt-tarefa').value = tarefaAchada.nome;
    document.getElementById('sel-prioridade').value = tarefaAchada.prioridade;
    document.getElementById('txt-descricao').value = tarefaAchada.descricao;

    // Muda o título do card e exibe o formulário na tela
    document.getElementById('form-titulo').innerText = "✏️ Editando Tarefa Selecionada";
    document.getElementById('container-form-tarefa').classList.remove('hidden');
    
    // Dá um efeito visual arrastando a tela suavemente até o formulário
    document.getElementById('container-form-tarefa').scrollIntoView({ behavior: 'smooth' });
}

// Operação: DELETE
function deletarTarefa(id) {
    if (confirm("Você tem certeza de que deseja remover esta tarefa definitivamente?")) {
        tarefas = JSON.parse(localStorage.getItem('tarefas')) || [];
        
        // Mantém todas as tarefas, excluindo apenas a que possui o ID clicado
        tarefas = tarefas.filter(t => t.id !== id);
        
        localStorage.setItem('tarefas', JSON.stringify(tarefas));
        
        // Atualiza a tabela preservando o que estava digitado no campo de busca
        const buscaAtual = document.getElementById('campo-busca').value;
        renderizarTabelaTarefas(buscaAtual);
    }
}

// Gatilho do Campo de Busca (Filtra a cada letra digitada)
document.getElementById('campo-busca').addEventListener('input', function(e) {
    renderizarTabelaTarefas(e.target.value);
});

// ==========================================================================
// 6. DISPARO INICIAL (QUANDO O SITE ABRE)
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Lê quem está logado de forma limpa do navegador ao atualizar
    usuarioLogado = JSON.parse(localStorage.getItem('usuarioLogado')) || null;
    usuarios = JSON.parse(localStorage.getItem('usuarios')) || [];
    
    renderizarMenu();
    navegarPara('sec-home'); // Força começar sempre pela Home
});