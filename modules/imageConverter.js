(function(){
    const fileInput = document.getElementById('fileInput');
    const loadingTip = document.getElementById('loadingTip');

    window.ImageConverter = {
        openImageSelector(){
            fileInput.value = '';
            fileInput.click();
        }
    };

    fileInput.addEventListener('change',(e)=>{
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev)=>{
            const img = new Image();
            img.onload = ()=>{
                processImage(img);
            };
            img.src = ev.target.result;
        };
        reader.readAsDataURL(file);
    });

    function processImage(img) {
        loadingTip.style.display = 'block';
        setTimeout(()=>{
            const size = window.CURRENT_GRID_SIZE || 50;
            const cvs = document.createElement('canvas');
            const ctx = cvs.getContext('2d');
            cvs.width = size;
            cvs.height = size;
            ctx.drawImage(img,0,0,size,size);
            const data = ctx.getImageData(0,0,size,size).data;
            const colors = window.MARD_COLOR_LIST;
            const result = [];

            for(let i=0;i<data.length;i+=4){
                const r = data[i];
                const g = data[i+1];
                const b = data[i+2];
                let min = 999999;
                let pick = colors[0];
                colors.forEach(c=>{
                    const d = (r-c.r)**2 + (g-c.g)**2 + (b-c.b)**2;
                    if(d<min){ min=d; pick=c; }
                });
                result.push(pick);
            }

            window.importImageResult(result);
            loadingTip.style.display = 'none';
        }, 20);
    }
})();
