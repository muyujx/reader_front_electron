/**
 * 书籍下载服务模块
 * 负责书籍的下载、本地存储和读取功能
 */

import { ipcMain } from "electron";
import {
    initDb,
    insertOrUpdateBook,
    batchInsertBookPages,
    getBookByBookId,
    getBookPage,
    deleteBook,
    deleteBookPagesByBookId,
    createBookPages,
    getDownloadedPageCount,
    getFirstUndownloadedPageIdx,
    batchMarkPageDownloaded,
    getAllBooks,
    updateBookReadProgress
} from "./dbService";
import { httpPost } from "./request";
import axios from "axios";
import * as Path from 'path';
import * as fs from 'fs';
import { DEV_MOD, SERVER_DEV_HOST, SERVER_PROD_HOST, API_BOOK_PAGE_LIST } from "../../common/hostConfig";
import ipcChannel from "../../common/ipcChannel";
import { getCacheRootDir } from "../config";

// ============================================
// 类型定义
// ============================================

/**
 * 书籍信息
 */
interface BookInfo {
    bookId: number;
    bookName: string;
    totalPage: number;
    coverPic: string;
    bigCoverPic: string;
    tagId: number;
}

/**
 * 书籍页面项
 */
interface PageItem {
    content: string;
    title: string;
    page: number;
    topChapter: number;
}

/**
 * 下载进度信息
 */
interface DownloadProgress {
    bookId: number;
    progress: number;
    downloadedPages: number;
    totalPage: number;
}

// 正在下载的书籍集合（用于暂停控制）
const downloadingBooks = new Set<number>();

// ============================================
// 常量定义
// ============================================

/** 每批获取的页数 */
const BATCH_SIZE = 5;

/**
 * 初始化书籍下载相关的 IPC 事件处理
 */
export function initBookDownloadIpc(): void {
    // 异步初始化数据库
    initDb().then(() => {
        console.log('[Download] Database initialized');
    }).catch(err => {
        console.error('[Download] Failed to initialize database:', err);
    });

    /**
     * 下载书籍到本地
     * 步骤：
     * 1. 先创建 book 记录和所有 book_page 记录（status=0 未下载）
     * 2. 遍历书籍每一页（每5页一批获取）
     * 3. 下载成功后标记页面为已下载（status=1）
     * 4. 进度根据已下载页面数计算
     */
    ipcMain.handle(ipcChannel.bookDownload, async (event: any, bookInfo: BookInfo) => {
        console.log('-------------------------');
        console.log(bookInfo);

        console.log('[Download] Start download:', bookInfo);

        // 确保数据库已初始化
        await initDb();

        // 清理旧下载记录
        await cleanOldDownload(bookInfo.bookId);

        // 先创建 book 记录
        insertOrUpdateBook(
            bookInfo.bookId,
            bookInfo.bookName,
            bookInfo.totalPage,
            bookInfo.coverPic,
            bookInfo.bigCoverPic,
            bookInfo.tagId
        );

        // 创建所有书页记录（status=0 未下载）
        createBookPages(bookInfo.bookId, bookInfo.totalPage);

        // 发送初始进度
        sendDownloadProgress(event, bookInfo.bookId, 0, bookInfo.totalPage);

        // 执行下载
        try {
            await downloadBookPages(event, bookInfo);
        } catch (error) {
            console.error(`[Download] Failed to download book ${bookInfo.bookId}:`, error);
            return { success: false, bookId: bookInfo.bookId, error: error instanceof Error ? error.message : 'Unknown error' };
        }

        console.log(`[Download] Completed: ${bookInfo.bookName} (ID: ${bookInfo.bookId})`);
        return { success: true, bookId: bookInfo.bookId };
    });

    /**
     * 继续下载书籍（断点续传）
     * 支持两种模式：
     * 1. 暂停状态：恢复下载
     * 2. 非暂停状态：继续下载未完成的页面
     */
    ipcMain.handle(ipcChannel.bookResumeDownload, async (event: any, bookId: number) => {
        console.log('[Download] Resume download for book ID:', bookId);

        // 确保数据库已初始化
        await initDb();

        // 检查是否是暂停状态
        if (downloadingBooks.has(-bookId)) {
            // 恢复下载
            console.log(`[Download] Resuming from pause: ${bookId}`);
            downloadingBooks.delete(-bookId);
            downloadingBooks.add(bookId);
            return { success: true, resumed: true };
        }

        // 获取书籍信息
        const book = getBookByBookId(bookId);
        if (!book) {
            return { success: false, bookId, error: 'Book not found' };
        }

        const bookInfo: BookInfo = {
            bookId: book.book_id,
            bookName: book.book_name,
            totalPage: book.total_page,
            coverPic: book.cover_pic,
            bigCoverPic: book.big_cover_pic,
            tagId: book.tag_id
        };

        // 获取当前已下载数量，发送初始进度
        const downloadedCount = getDownloadedPageCount(bookId);
        sendDownloadProgress(event, bookId, downloadedCount, bookInfo.totalPage);

        // 从第一个未下载的页面开始继续下载
        try {
            await resumeDownloadPages(event, bookInfo);
        } catch (error) {
            console.error(`[Download] Failed to resume download book ${bookId}:`, error);
            return { success: false, bookId, error: error instanceof Error ? error.message : 'Unknown error' };
        }

        console.log(`[Download] Resume completed for book ID: ${bookId}`);
        return { success: true, bookId };
    });

    /**
     * 暂停下载
     */
    ipcMain.handle(ipcChannel.bookPauseDownload, async (event: any, bookId: number) => {
        console.log(`[Download] Pausing: ${bookId}`);
        // 标记为暂停：使用负数表示暂停状态
        if (downloadingBooks.has(bookId)) {
            downloadingBooks.delete(bookId);
            downloadingBooks.add(-bookId);
            return { success: true };
        }
        return { success: false, error: 'Book is not downloading' };
    });

    /**
     * 取消下载
     */
    ipcMain.handle(ipcChannel.bookCancelDownload, async (event: any, bookId: number) => {
        console.log(`[Download] Cancelling: ${bookId}`);
        // 移除下载标记
        downloadingBooks.delete(bookId);
        downloadingBooks.delete(-bookId);
        return { success: true };
    });

    /**
     * 获取书籍下载进度
     */
    ipcMain.handle(ipcChannel.bookGetDownloadProgress, async (event: any, bookId: number) => {
        await initDb();
        const book = getBookByBookId(bookId);
        if (!book) {
            return { exists: false, downloadedPages: 0, totalPage: 0 };
        }
        const downloadedPages = getDownloadedPageCount(bookId);
        const totalPage = book.total_page;
        return {
            exists: true,
            downloadedPages,
            totalPage
        };
    });

    /**
     * 从本地获取书籍页面
     */
    ipcMain.handle(ipcChannel.bookGetPage, async (event: any, { bookId, page }: { bookId: number, page: number }) => {
        await initDb();

        const book = getBookByBookId(bookId);
        if (!book) {
            return null;
        }

        const pageData = getBookPage(bookId, page);
        if (!pageData) {
            return null;
        }

        return {
            content: pageData.content,
            title: pageData.title,
            page: pageData.page_idx,
            topChapter: pageData.top_chapter
        };
    });

    /**
     * 获取所有已下载的书籍列表
     */
    ipcMain.handle(ipcChannel.bookGetAllList, async (event: any) => {
        await initDb();
        const books = getAllBooks();
        
        // 为每本书添加下载进度信息
        const booksWithProgress = books.map((book: any) => {
            const downloadedPages = getDownloadedPageCount(book.book_id);
            const totalPage = book.total_page;
            return {
                bookId: book.book_id,
                bookName: book.book_name,
                totalPage: totalPage,
                coverPic: book.cover_pic,
                bigCoverPic: book.big_cover_pic,
                tagId: book.tag_id,
                createTime: book.create_time,
                downloadedPages,
                progress: totalPage > 0 ? Math.floor((downloadedPages / totalPage) * 100) : 0,
                // 添加阅读进度相关字段
                readPage: book.read_page || 0,
                lastRead: book.last_read_time || 0,
                readingCost: book.reading_cost || 0
            };
        });
        
        return booksWithProgress;
    });

    /**
     * 更新书籍阅读进度
     */
    ipcMain.handle(ipcChannel.bookUpdateReadProgress, async (event: any, { bookId, readPage, readingCost }: { bookId: number, readPage: number, readingCost: number }) => {
        await initDb();
        updateBookReadProgress(bookId, readPage, readingCost);
        return { success: true };
    });
}

// ============================================
// 私有函数
// ============================================

/**
 * 获取服务器地址
 * 根据开发/生产模式返回对应的服务器地址
 * 
 * @returns 服务器地址
 */
function getServerHost(): string {
    return DEV_MOD ? SERVER_DEV_HOST : SERVER_PROD_HOST;
}

/**
 * 从 HTML 内容中提取所有图片 URL
 * 
 * @param htmlContent HTML 内容
 * @returns 图片 URL 数组
 */
function getBookImages(htmlContent: string): string[] {
    const imgRegex = /<img[^>]+src=["']([^"']+)["']/gi;
    const images: string[] = [];
    let match;

    while ((match = imgRegex.exec(htmlContent)) !== null) {
        images.push(match[1]);
    }

    return images;
}

/**
 * 处理图片 URL，返回完整的服务器地址
 * 
 * @param content 页面内容
 * @return 处理后的图片 URL 数组
 */
function getProcessedImageUrls(content: string): string[] {
    const images = getBookImages(content);
    const serverHost = getServerHost();

    return images.map(img => {
        // 如果已经是完整 URL，直接返回
        if (img.startsWith('http')) {
            return img;
        }
        // 否则拼接服务器地址
        return serverHost + img;
    });
}

/**
 * 下载书籍图片到本地缓存
 * 将图片保存到缓存目录，复用现有的图片加载机制
 * 
 * @param bookId 书籍 ID
 * @param imageUrls 图片 URL 数组
 * @returns 成功下载的图片数量
 */
async function downloadBookImages(bookId: number, imageUrls: string[]): Promise<number> {
    const cacheRootDir = await getCacheRootDir();
    const resourceDir = Path.join(cacheRootDir, 'resource');

    // 创建资源目录
    if (!fs.existsSync(resourceDir)) {
        fs.mkdirSync(resourceDir, { recursive: true });
    }

    let successCount = 0;

    for (const imgUrl of imageUrls) {
        try {
            const imgResponse = await axios.get(imgUrl, {
                responseType: 'arraybuffer'
            });

            // 从 URL 提取文件路径（/resource/xxx/yyy.jpg）
            const urlObj = new URL(imgUrl);
            const urlPath = urlObj.pathname;

            // 提取 /resource/ 后的路径
            const resourcePath = urlPath.startsWith('/resource') 
                ? urlPath.substring('/resource'.length) 
                : urlPath;

            // 构建本地保存路径
            const localPath = Path.join(resourceDir, resourcePath);

            // 确保目录存在
            const localDir = Path.dirname(localPath);
            if (!fs.existsSync(localDir)) {
                fs.mkdirSync(localDir, { recursive: true });
            }

            // 保存图片到本地缓存
            fs.writeFileSync(localPath, Buffer.from(imgResponse.data));
            successCount++;

        } catch (imgError) {
            console.error(`[Download] Failed to download image: ${imgUrl}`, imgError);
        }
    }

    return successCount;
}

async function cleanOldDownload(bookId: number): Promise<void> {
    const existingBook = getBookByBookId(bookId);
    if (existingBook) {
        console.log(`[Download] Removing old download for book ID: ${bookId}`);
        deleteBookPagesByBookId(bookId);
        deleteBook(bookId);
    }
}

/**
 * 下载书籍所有页面
 */
async function downloadBookPages(event: any, bookInfo: BookInfo): Promise<void> {
    const { bookId, totalPage } = bookInfo;
    let downloadedPages = 0;

    // 标记为正在下载
    downloadingBooks.add(bookId);

    try {
        // 遍历书籍每一页，每5页一批获取
        for (let startPage = 1; startPage <= totalPage; startPage += BATCH_SIZE) {
            // 检查是否暂停
            while (downloadingBooks.has(bookId) === false) {
                // 已暂停，等待恢复或退出
                await new Promise(resolve => setTimeout(resolve, 500));
                if (!downloadingBooks.has(bookId) && !downloadingBooks.has(-bookId)) {
                    // 已取消下载
                    console.log(`[Download] Cancelled: ${bookId}`);
                    return;
                }
            }

            const success = await downloadPageBatch(event, bookId, startPage, totalPage);
            if (success > 0) {
                downloadedPages += success;
                sendDownloadProgress(event, bookId, downloadedPages, totalPage);
            } else {
                throw new Error(`Failed to download pages starting from ${startPage}`);
            }
        }
    } finally {
        downloadingBooks.delete(bookId);
    }
}

/**
 * 下载单批页面
 */
async function downloadPageBatch(
    event: any,
    bookId: number,
    startPage: number,
    totalPage: number
): Promise<number> {
    const response = await httpPost(
        API_BOOK_PAGE_LIST,
        {
            bookId,
            startPage: startPage,
            pageSize: BATCH_SIZE
        }
    );

    // 检查响应是否有效
    if (!isValidResponse(response)) {
        throw new Error(`Invalid response for pages starting from ${startPage}`);
    }

    return await processPageBatch(bookId, response.data);
}

/**
 * 检查响应是否有效
 */
function isValidResponse(response: any): boolean {
    return response && 
           response.code === 0 && 
           Array.isArray(response.data) && 
           response.data.length > 0;
}

/**
 * 处理一批页面数据
 */
async function processPageBatch(bookId: number, pageList: any[]): Promise<number> {
    const pagesToSave: Array<{
        pageIdx: number;
        content: string;
        title: string;
        topChapter: number;
    }> = [];

    for (const pageData of pageList) {
        const pageItem: PageItem = pageData;
        const imageUrls = getProcessedImageUrls(pageItem.content);

        if (imageUrls.length > 0) {
            await downloadBookImages(bookId, imageUrls);
        }

        pagesToSave.push({
            pageIdx: pageItem.page,
            content: pageItem.content,
            title: pageItem.title || '',
            topChapter: pageItem.topChapter || 0
        });
    }

    if (pagesToSave.length > 0) {
        // 批量标记页面为已下载
        batchMarkPageDownloaded(bookId, pagesToSave);
    }

    return pagesToSave.length;
}

/**
 * 发送下载进度
 */
function sendDownloadProgress(
    event: any,
    bookId: number,
    downloadedPages: number,
    totalPage: number
): void {
    const progress = Math.floor((downloadedPages / totalPage) * 100);
    const progressInfo: DownloadProgress = {
        bookId,
        progress,
        downloadedPages,
        totalPage
    };

    event.sender.send(ipcChannel.bookDownloadProgress, progressInfo);
    console.log(`[Download] Progress: ${progress}% (${downloadedPages}/${totalPage})`);
}

// ============================================
// 继续下载相关方法
// ============================================

/**
 * 继续下载书籍未完成的页面（断点续传）
 */
async function resumeDownloadPages(event: any, bookInfo: BookInfo): Promise<void> {
    const { bookId, totalPage } = bookInfo;

    // 获取第一个未下载页面的索引
    let startPage = getFirstUndownloadedPageIdx(bookId);
    if (startPage === -1) {
        console.log(`[Download] All pages already downloaded for book ID: ${bookId}`);
        return;
    }

    console.log(`[Download] Resuming from page ${startPage} for book ID: ${bookId}`);

    // 标记为正在下载
    downloadingBooks.add(bookId);

    try {
        // 从第一个未下载页面开始，每5页一批获取
        while (startPage <= totalPage) {
            // 检查是否暂停
            while (downloadingBooks.has(bookId) === false) {
                await new Promise(resolve => setTimeout(resolve, 500));
                if (!downloadingBooks.has(bookId) && !downloadingBooks.has(-bookId)) {
                    console.log(`[Download] Cancelled: ${bookId}`);
                    return;
                }
            }

            const success = await downloadPageBatch(event, bookId, startPage, totalPage);
            if (success > 0) {
                // 获取当前已下载数量作为进度
                const downloadedPages = getDownloadedPageCount(bookId);
                sendDownloadProgress(event, bookId, downloadedPages, totalPage);
                startPage += BATCH_SIZE;
            } else {
                throw new Error(`Failed to download pages starting from ${startPage}`);
            }
        }
    } finally {
        downloadingBooks.delete(bookId);
    }
}
