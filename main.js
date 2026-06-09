const grid = document.getElementById('grid');
const colorPanel = document.getElementById('colorPanel');
const sizeSelect = document.getElementById('sizeSelect');
const importImgBtn = document.getElementById('importImgBtn');
const undoBtn = document.getElementById('undoBtn');
const redoBtn = document.getElementById('redoBtn');
const saveImgBtn = document.getElementById('saveImgBtn');
const savePatternBtn = document.getElementById('savePatternBtn');
const tabs = document.querySelectorAll('.tab-item');

let currentSize = 50;
let currentColor = { r:255,g:255,b:255 };
let gridData = [];
let history = [];
let redoStack = [];

function init() {
    initColorTabs();
    initGrid();
    initEvents();
}

function initColorTabs() {
    showGroup('A');
    tabs.forEach(tab=>{
        tab.addEventListener('click',()=>{
            tabs.forEach(t=>t.classList.remove('active'));
            tab.classList.add('active');
            showGroup(tab.dataset.group);
        });
    });
}

function showGroup(group) {
    colorPanel.innerHTML = '';
    colorData[group].forEach(([code, hex])=>{
        const div = document.createElement('div');
        div.className = 'color-item';
        div.style.backgroundColor = hex;
        div.dataset.hex = hex;
        div.onclick = ()=>{
            document.querySelectorAll('.color-item').forEach(i=>i.classList.remove('active'));
            div.classList.add('active');
            currentColor = hexToRgb(hex);
        };
        colorPanel.appendChild(div);
    });
}

function initGrid() {
    gridData = [];
    grid.innerHTML = '';
    grid.style.gridTemplateColumns = `repeat(${currentSize}, 20px)`;
    for(let y=0;y<currentSize;y++){
        gridData[y] = [];
        for(let x=0;x<currentSize;x++){
            gridData[y][x] = {r:255,g:255,b:255};
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.x = x;
            cell.dataset.y = y;
            cell.style.backgroundColor = '#fff';
            cell.onclick = ()=>{
                saveHistory();
                gridData[y][x] = {...currentColor};
                cell.style.backgroundColor = `rgb(${currentColor.r},${currentColor.g},${currentColor.b})`;
            };
            grid.appendChild(cell);
        }
    }
}

function saveHistory() {
    history.push(JSON.stringify(gridData));
    redoStack = [];
}

function undo() {
    if(history.length===0) return;
    redoStack.push(JSON.stringify(gridData));
    gridData = JSON.parse(history.pop());
    renderGrid();
}

function renderGrid() {
    const cells = document.querySelectorAll('.cell');
    cells.forEach((cell,i)=>{
        const x = i%currentSize;
        const y = Math.floor(i/currentSize);
        const c = gridData[y][x];
        cell.style.backgroundColor = `rgb(${c.r},${c.g},${c.b})`;
    });
}

function initEvents() {
    sizeSelect.addEventListener('change',()=>{
        currentSize = parseInt(sizeSelect.value);
        initGrid();
    });
    undoBtn.addEventListener('click', undo);
    importImgBtn.addEventListener('click',()=>{
        ImageConverter.openImageSelector();
    });
}

window.importImageResult = (colors)=>{
    saveHistory();
    let idx=0;
    for(let y=0;y<currentSize;y++){
        for(let x=0;x<currentSize;x++){
            gridData[y][x] = colors[idx++] || {r:255,g:255,b:255};
        }
    }
    renderGrid();
};

window.CURRENT_GRID_SIZE = currentSize;
window.addEventListener('load', init);
