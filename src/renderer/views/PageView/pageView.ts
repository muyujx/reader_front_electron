import {onBeforeUnmount} from "vue";
import {addReadingCostApi} from "../../apis/favoriteBook.ts";

/**
 * 记录阅读时间
 */
export function recordReadingTime(bookId: number) {
    // 开始时间
    let start = Date.now() / 1000;

    // 小于 10 秒不记录
    const minTime = 10;

    let cost = 0;
    let windowActive = true;

    const blurFunc = () => {
        const now = Date.now() / 1000;
        cost += now - start;
        windowActive = false;
    }

    const focusFunc = () => {
        start = Date.now() / 1000;
        windowActive = true;
    }

    // 当窗口失去焦点时触发
    window.addEventListener('blur', blurFunc);
    // 当窗口获得焦点时触发
    window.addEventListener('focus', focusFunc);

    const updateCostFunc = () => {
        if (!windowActive) {
            return;
        }

        const now = Date.now() / 1000;
        cost += now - start;
        start = now;
        cost = Math.floor(cost);

        if (cost < minTime) {
            return;
        }

        console.log(`-------- cost = ${cost} --------`);

        addReadingCostApi(bookId, cost)
            .then(() => {
                cost = 0;
            })
            .catch(err => {
                console.log(err);
            })
    }

    const intervalId = setInterval(updateCostFunc, 10 * 1000);


    onBeforeUnmount(() => {
        clearInterval(intervalId);
        window.removeEventListener('blur', blurFunc);
        window.removeEventListener('focus', focusFunc);
        updateCostFunc();
    });

}


