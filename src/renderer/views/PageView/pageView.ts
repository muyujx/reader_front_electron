import {onBeforeUnmount, Ref} from "vue";
import {updateReadingProgressApi} from "../../apis/progress.ts";
import {PageItem} from "../../model/pageModel.ts";


let lastUpdatePage = 0;

export function updateReadProgress(bookId: number, page: number,
                                   readingCost: number = 0): Promise<void> {
    if (readingCost == 0 && lastUpdatePage == page) {
        return Promise.resolve();
    }
    lastUpdatePage = page;
    return updateReadingProgressApi(bookId, page, readingCost);
}


let pageConfirmInterval = -1;

/**
 * 记录阅读进度
 * @param bookId 书籍 id
 * @param curPageItem 当前显示的页面
 * @param pageConfirm 是否处于 本地 和 远程 进度的选择流程
 */
export function recordReadingProgress(bookId: number,
                                      curPageItem: Ref<PageItem>,
                                      pageConfirm: Ref<boolean>) {

    onBeforeUnmount(() => {
        console.log("------ pageConfirmInterval onBeforeUnmount -------");
        if (pageConfirmInterval != -1) {
            clearInterval(pageConfirmInterval);
        }
    })

    if (pageConfirm.value) {
        pageConfirmInterval = setInterval(() => {
            if (!pageConfirm.value) {
                startRecordProgress(bookId, curPageItem);
                clearInterval(pageConfirmInterval);
            }
        }, 1000);
    } else {
        startRecordProgress(bookId, curPageItem);
    }

}

function startRecordProgress(bookId: number,
                             curPageItem: Ref<PageItem>) {
    // 开始时间
    let start = Date.now();

    let cost = 0;
    let windowActive = true;

    const blurFunc = () => {
        console.log("------  blurFunc ------");
        cost += Date.now() - start;
        windowActive = false;
    }

    const focusFunc = () => {
        console.log("------- focusFunc --------");
        start = Date.now();
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

        const now = Date.now();
        cost += now - start;
        start = now;

        let seconds = Math.floor(cost / 1000);
        let page = curPageItem.value.page;

        updateReadProgress(bookId, page, seconds)
            .then(r => {
                cost -= seconds * 1000;
            })
            .catch(err => {
                console.log(err);
            });
        console.log(`-------- bookId = ${bookId} page = ${page} cost = ${cost} --------`);
    }

    const intervalId = setInterval(updateCostFunc, 5 * 1000);

    onBeforeUnmount(() => {
        console.log("----------- startRecordProgress onBeforeUnmount -------");
        clearInterval(intervalId);
        window.removeEventListener('blur', blurFunc);
        window.removeEventListener('focus', focusFunc);
        updateCostFunc();
    });
}


