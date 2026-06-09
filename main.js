(function(){
    // 全局状态
    const sizeSelect = document.getElementById('sizeSelect');
    const gridEl = document.getElementById('grid');
    const colorPanel = document.getElementById('colorPanel');
    const importImgBtn = document.getElementById('importImgBtn');
    const fileInput = document.getElementById('fileInput');

    let currentGridSize = 50;
    let selectColor = {r:255,g:255,b:255};
    let gridData = [];

    // 对外暴露全局变量（供图片模块读取）
    window.CURRENT_GRID_SIZE = currentGridSize;

    // 初始化色板
    function initColorPanel(){
        colorPanel.innerHTML = '';
        window.MARD_COLOR_LIST.forEach(item=>{
            const div = document.createElement('div');
            div.className = 'color-item';
            div.style.backgroundColor = `rgb(${item.r},${item.g},${item.b})`;
            div.dataset.r = item.r;
            div.dataset.g = item.g;
            div.dataset.b = item.b;
            div.addEventListener('click',()=>{
                document.querySelectorAll('.color-item').forEach(el=>el.classList.remove('active'));
                div.classList.add('active');
                selectColor = {
                    r: parseInt(div.dataset.r),
                    g: parseInt(div.dataset.g),
                    b: parseInt(div.dataset.b)
                };
            });
            colorPanel.appendChild(div);
        });
    }

    // 初始化网格
    function initGrid(size){
        currentGridSize = size;
        window.CURRENT_GRID_SIZE = size;
        gridData = [];
        gridEl.style.gridTemplateColumns = `repeat(${size}, 1fr)`;
        gridEl.style.width = `${size * 22}px`;
        gridEl.innerHTML = '';

        for(let y=0; y<size; y++){
            gridData[y] = [];
            for(let x=0; x<size; x++){
                gridData[y][x] = {r:255,g:255,b:255};
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.style.width = '22px';
                cell.style.height = '22px';
                cell.dataset.x = x;
                cell.dataset.y = y;
                cell.style.backgroundColor = `rgb(255,255,255)`;
                cell.addEventListener('click',()=>{
                    const x = parseInt(cell.dataset.x);
                    const y = parseInt(cell.dataset.y);
                    gridData[y][x] = {...selectColor};
                    cell.style.backgroundColor = `rgb(${selectColor.r},${selectColor.g},${selectColor.b})`;
                });
                gridEl.appendChild(cell);
            }
        }
    }

    // 批量填充网格（图片模块回调入口）
    function fillGridByMatrix(matrix){
        const size = matrix.length;
        for(let y=0; y<size; y++){
            for(let x=0; x<size; x++){
                const color = matrix[y][x];
                gridData[y][x] = {...color};
                const cell = gridEl.children[y * size + x];
                cell.style.backgroundColor = `rgb(${color.r},${color.g},${color.b})`;
            }
        }
    }

    // 绑定图片模块回调
    ImageConverter.onConvertComplete = fillGridByMatrix;

    // 尺寸切换
    sizeSelect.addEventListener('change',()=>{
        initGrid(parseInt(sizeSelect.value));
    });

    // 导入图像按钮
    importImgBtn.addEventListener('click',()=>{
        ImageConverter.openImageSelector();
    });

    // 页面初始化
    window.addEventListener('load',()=>{
        initColorPanel();
        initGrid(currentGridSize);
    });
})();
