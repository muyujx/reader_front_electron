import {onBeforeUnmount} from "vue";
import {addReadingCostApi} from "../../apis/favoriteBook.ts";

/**
 * 记录阅读时间
 */
export function recordReadingTime(bookId: number) {
    // 开始时间
    let start = Date.now() / 1000;

    // 小于 60 秒不记录
    const minTime = 60;

    let cost = 0;

    const blurFunc = () => {
        console.log(`--------- win blur start = ${start} ---------`);
        const now = Date.now() / 1000;
        cost += now - start;
    }

    const focusFunc = () => {
        console.log(`----------- win focus start = ${start} -----------`);
        start = Date.now() / 1000;
    }

    // 当窗口失去焦点时触发
    window.addEventListener('blur', blurFunc);
    // 当窗口获得焦点时触发
    window.addEventListener('focus', focusFunc);

    onBeforeUnmount(() => {

        window.removeEventListener('blur', blurFunc);
        window.removeEventListener('focus', focusFunc);

        cost += Date.now() / 1000 - start;
        cost = Math.floor(cost);
        if (cost <= minTime) {
            return;
        }

        console.log(`-------- cost = ${cost} --------`);

        addReadingCostApi(bookId, cost)
            .catch(err => {
                console.log(err);
            })
    });

}


