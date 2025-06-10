import rq from "./request";


/**
 * 获取远程书页进度
 */
export function getRemotePage(bookId: number): Promise<number> {
    return rq.get({
        url: `/api/user/page/get?bookId=${bookId}`,
    });
}

/**
 * 更新远程书页进度
 */
export function updateRemotePage(bookId: number, page: number) {
    rq.post({
        url: `/api/user/page/update`,
        body: {
            bookId,
            page
        }
    }).then(r => {
    });
}

