import {onBeforeUnmount} from "vue";
import {addReadingCostApi} from "../../apis/favoriteBook.ts";

/**
 * 记录阅读时间
 */
export function recordReadingTime(bookId: number) {
    // 开始时间
    const start = Date.now() / 1000;

    // 小于 60 秒不记录
    const minTime = 60;

    onBeforeUnmount(() => {
        const cost = Math.floor(Date.now() / 1000 - start);
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


