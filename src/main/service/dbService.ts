/**
 * 数据库服务模块
 * 负责 SQLite 数据库的初始化和基本 CRUD 操作
 * 使用 sql.js（纯 JavaScript 实现）
 * 
 * 表结构：
 * - book: 存储已下载的书籍信息
 * - book_page: 存储书籍页面内容
 * 
 * 详细字段说明请参阅建表 SQL 注释
 */

import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import * as Path from 'path';
import * as fs from 'fs';
import { getCacheRootDir } from '../config';

// 数据库实例
let db: SqlJsDatabase | null = null;

// 数据库文件路径
let dbPath: string = '';

/**
 * 获取当前时间戳（秒）
 */
function getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
}

/**
 * 初始化数据库
 * 如果数据库文件已存在，则加载；否则创建新数据库
 */
export async function initDb(): Promise<void> {
    if (db) {
        return;
    }

    try {
        // 获取缓存根目录
        const cacheRootDir = await getCacheRootDir();
        const dbDir = Path.join(cacheRootDir, 'db');

        // 确保目录存在
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }

        // 数据库文件路径
        dbPath = Path.join(dbDir, 'book.db');

        // 初始化 SQL.js
        const SQL = await initSqlJs();

        // 如果数据库文件已存在，则加载
        if (fs.existsSync(dbPath)) {
            const buffer = fs.readFileSync(dbPath);
            db = new SQL.Database(buffer);
            console.log('[DB] Database loaded from file');
        } else {
            // 创建新数据库
            db = new SQL.Database();
            console.log('[DB] New database created');
        }

        // 创建表
        createTables();

    } catch (error) {
        console.error('[DB] Failed to initialize database:', error);
        throw error;
    }
}

/**
 * 创建数据库表
 */
function createTables(): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    // 创建 book 表（存储已下载的书籍信息）
    // 字段说明：
    //   - id: 自增主键
    //   - book_id: 书籍ID
    //   - book_name: 书籍名称
    //   - total_page: 书籍总页数
    //   - cover_pic: 封面图片地址
    //   - big_cover_pic: 大封面图片地址
    //   - tag_id: 标签ID
    //   - read_page: 当前阅读到的页码
    //   - last_read_time: 上次阅读时间戳（秒）
    //   - reading_cost: 累计阅读耗时（秒）
    //   - create_time: 创建时间戳（秒）
    db.run(`
        CREATE TABLE IF NOT EXISTS book (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL UNIQUE,
            book_name TEXT NOT NULL,
            total_page INTEGER NOT NULL,
            cover_pic TEXT,
            big_cover_pic TEXT,
            tag_id INTEGER,
            read_page INTEGER DEFAULT 0,
            last_read_time INTEGER DEFAULT 0,
            reading_cost INTEGER DEFAULT 0,
            create_time INTEGER NOT NULL DEFAULT (strftime('%s', 'now'))
        )
    `);

    // 创建 book_page 表（存储书籍页面内容）
    // 字段说明：
    //   - id: 自增主键
    //   - book_id: 书籍ID
    //   - page_idx: 页面索引（页码）
    //   - content: 页面HTML内容
    //   - title: 页面标题
    //   - top_chapter: 顶级章节ID
    //   - status: 下载状态（0: 未下载, 1: 已下载）
    //   - create_time: 创建时间戳（秒）
    db.run(`
        CREATE TABLE IF NOT EXISTS book_page (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id INTEGER NOT NULL,
            page_idx INTEGER NOT NULL,
            content TEXT,
            title TEXT,
            top_chapter INTEGER,
            status INTEGER NOT NULL DEFAULT 0,
            create_time INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            UNIQUE(book_id, page_idx)
        )
    `);

    // 创建索引以提高查询性能
    db.run(`CREATE INDEX IF NOT EXISTS idx_book_page_book_id ON book_page(book_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_book_page_idx ON book_page(book_id, page_idx)`);

    // 保存数据库到文件
    saveDb();
}

/**
 * 获取数据库实例
 */
export function getDb(): SqlJsDatabase | null {
    return db;
}

/**
 * 保存数据库到文件
 */
export function saveDb(): void {
    if (db && dbPath) {
        const data = db.export();
        const buffer = Buffer.from(data);
        fs.writeFileSync(dbPath, buffer);
    }
}

/**
 * 关闭数据库连接
 */
export function closeDb(): void {
    if (db) {
        saveDb();
        db.close();
        db = null;
        console.log('[DB] Database closed');
    }
}

// ============================================
// Book 表操作
// ============================================

/**
 * 插入或更新书籍记录
 * 
 * @param bookId 书籍 ID
 * @param bookName 书籍名称
 * @param totalPage 书籍总页数
 * @param coverPic 封面图片地址
 * @param bigCoverPic 大封面图片地址
 * @param tagId 标签 ID
 * @param readPage 当前阅读到的页码（可选，保留已有值）
 * @param lastReadTime 上次阅读时间戳（可选）
 * @param readingCost 累计阅读耗时（可选）
 */
export function insertOrUpdateBook(
    bookId: number,
    bookName: string,
    totalPage: number,
    coverPic: string,
    bigCoverPic: string,
    tagId: number,
    readPage?: number,
    lastReadTime?: number,
    readingCost?: number
): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    const timestamp = getCurrentTimestamp();

    // 检查记录是否存在
    const existing = getBookByBookId(bookId);

    if (existing) {
        // 更新记录（保留已有的阅读进度字段）
        const newReadPage = readPage !== undefined ? readPage : (existing.read_page || 0);
        const newLastReadTime = lastReadTime !== undefined ? lastReadTime : (existing.last_read_time || 0);
        const newReadingCost = readingCost !== undefined ? readingCost : (existing.reading_cost || 0);
        
        db.run(`
            UPDATE book SET 
                book_name = ?,
                total_page = ?,
                cover_pic = ?,
                big_cover_pic = ?,
                tag_id = ?,
                read_page = ?,
                last_read_time = ?,
                reading_cost = ?
            WHERE book_id = ?
        `, [bookName, totalPage, coverPic, bigCoverPic, tagId, newReadPage, newLastReadTime, newReadingCost, bookId]);
    } else {
        // 插入新记录
        const initialReadPage = readPage || 0;
        const initialLastReadTime = lastReadTime || 0;
        const initialReadingCost = readingCost || 0;
        
        db.run(`
            INSERT INTO book (book_id, book_name, total_page, cover_pic, big_cover_pic, tag_id, read_page, last_read_time, reading_cost, create_time)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [bookId, bookName, totalPage, coverPic, bigCoverPic, tagId, initialReadPage, initialLastReadTime, initialReadingCost, timestamp]);
    }

    saveDb();
}

/**
 * 根据 book_id 查询书籍记录
 * 
 * @param bookId 书籍 ID
 * @returns 书籍记录，如果不存在则返回 null
 */
export function getBookByBookId(bookId: number): any | null {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return null;
    }

    const stmt = db.prepare('SELECT * FROM book WHERE book_id = ?');
    stmt.bind([bookId]);

    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }

    stmt.free();
    return null;
}

/**
 * 查询所有已下载的书籍
 * 
 * @returns 书籍列表
 */
export function getAllBooks(): any[] {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return [];
    }

    const results: any[] = [];
    const stmt = db.prepare('SELECT * FROM book ORDER BY create_time DESC');

    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }

    stmt.free();
    return results;
}

/**
 * 更新书籍阅读进度
 * 
 * @param bookId 书籍 ID
 * @param readPage 当前阅读到的页码
 * @param readingCost 累计阅读耗时（秒）
 */
export function updateBookReadProgress(bookId: number, readPage: number, readingCost: number): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    const timestamp = getCurrentTimestamp();
    
    // 更新阅读进度和阅读时间
    db.run(`
        UPDATE book SET 
            read_page = ?,
            last_read_time = ?,
            reading_cost = ?
        WHERE book_id = ?
    `, [readPage, timestamp, readingCost, bookId]);

    saveDb();
    console.log(`[DB] Updated reading progress for book ${bookId}: page=${readPage}, cost=${readingCost}s`);
}

/**
 * 根据 book_id 删除书籍记录（级联删除页面）
 * 
 * @param bookId 书籍 ID
 */
export function deleteBook(bookId: number): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    // 先删除关联的页面
    deleteBookPagesByBookId(bookId);

    // 删除书籍记录
    db.run('DELETE FROM book WHERE book_id = ?', [bookId]);
    saveDb();
}

// ============================================
// Book Page 表操作
// ============================================

/**
 * 插入或更新书籍页面
 * 
 * @param bookId 书籍 ID
 * @param pageIdx 页面索引（页码）
 * @param content 页面 HTML 内容
 * @param title 页面标题
 * @param topChapter 章节ID
 */
export function insertOrUpdateBookPage(
    bookId: number,
    pageIdx: number,
    content: string,
    title: string,
    topChapter: number
): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    const timestamp = getCurrentTimestamp();

    // 检查记录是否存在
    const existing = getBookPage(bookId, pageIdx);

    if (existing) {
        // 更新记录
        db.run(`
            UPDATE book_page SET 
                content = ?,
                title = ?,
                top_chapter = ?
            WHERE book_id = ? AND page_idx = ?
        `, [content, title, topChapter, bookId, pageIdx]);
    } else {
        // 插入新记录
        db.run(`
            INSERT INTO book_page (book_id, page_idx, content, title, top_chapter, create_time)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [bookId, pageIdx, content, title, topChapter, timestamp]);
    }

    saveDb();
}

/**
 * 批量插入或更新书籍页面
 * 
 * @param bookId 书籍 ID
 * @param pagesData 页面数据数组，每项包含 pageIdx, content, title, topChapter
 */
export function batchInsertBookPages(
    bookId: number,
    pagesData: Array<{
        pageIdx: number;
        content: string;
        title: string;
        topChapter: number;
    }>
): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    const timestamp = getCurrentTimestamp();

    for (const pageData of pagesData) {
        // 检查记录是否存在
        const existing = getBookPage(bookId, pageData.pageIdx);

        if (existing) {
            // 更新记录
            db.run(`
                UPDATE book_page SET 
                    content = ?,
                    title = ?,
                    top_chapter = ?
                WHERE book_id = ? AND page_idx = ?
            `, [pageData.content, pageData.title, pageData.topChapter, bookId, pageData.pageIdx]);
        } else {
            // 插入新记录
            db.run(`
                INSERT INTO book_page (book_id, page_idx, content, title, top_chapter, create_time)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [bookId, pageData.pageIdx, pageData.content, pageData.title, pageData.topChapter, timestamp]);
        }
    }

    saveDb();
}

/**
 * 根据 book_id 和 page_idx 查询书籍页面
 * 
 * @param bookId 书籍 ID
 * @param pageIdx 页面索引（页码）
 * @returns 页面记录，如果不存在则返回 null
 */
export function getBookPage(bookId: number, pageIdx: number): any | null {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return null;
    }

    const stmt = db.prepare('SELECT * FROM book_page WHERE book_id = ? AND page_idx = ?');
    stmt.bind([bookId, pageIdx]);

    if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
    }

    stmt.free();
    return null;
}

/**
 * 根据 book_id 查询所有页面
 * 
 * @param bookId 书籍 ID
 * @returns 页面列表
 */
export function getBookPagesByBookId(bookId: number): any[] {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return [];
    }

    const results: any[] = [];
    const stmt = db.prepare('SELECT * FROM book_page WHERE book_id = ? ORDER BY page_idx');
    stmt.bind([bookId]);

    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }

    stmt.free();
    return results;
}

/**
 * 根据 book_id 删除所有页面记录
 * 
 * @param bookId 书籍 ID
 */
export function deleteBookPagesByBookId(bookId: number): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    db.run('DELETE FROM book_page WHERE book_id = ?', [bookId]);
    saveDb();
}

/**
 * 创建指定数量的空白页面记录
 * 
 * @param bookId 书籍 ID
 * @param totalPage 总页数
 */
export function createBookPages(bookId: number, totalPage: number): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    const timestamp = getCurrentTimestamp();

    for (let i = 1; i <= totalPage; i++) {
        db.run(`
            INSERT OR IGNORE INTO book_page (book_id, page_idx, status, create_time)
            VALUES (?, ?, 0, ?)
        `, [bookId, i, timestamp]);
    }

    saveDb();
}

/**
 * 标记指定页面为已下载
 * 
 * @param bookId 书籍 ID
 * @param pageIdx 页面索引（页码）
 */
export function markPageDownloaded(bookId: number, pageIdx: number): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    db.run(`
        UPDATE book_page SET status = 1 WHERE book_id = ? AND page_idx = ?
    `, [bookId, pageIdx]);

    saveDb();
}

/**
 * 批量标记页面为已下载
 * 
 * @param bookId 书籍 ID
 * @param pagesData 页面数据数组，每项包含 pageIdx, content, title, topChapter
 */
export function batchMarkPageDownloaded(
    bookId: number,
    pagesData: Array<{
        pageIdx: number;
        content: string;
        title: string;
        topChapter: number;
    }>
): void {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return;
    }

    for (const pageData of pagesData) {
        // 更新页面内容
        db.run(`
            UPDATE book_page SET 
                content = ?,
                title = ?,
                top_chapter = ?,
                status = 1
            WHERE book_id = ? AND page_idx = ?
        `, [pageData.content, pageData.title, pageData.topChapter, bookId, pageData.pageIdx]);
    }

    saveDb();
}

/**
 * 获取已下载的页面数量
 * 
 * @param bookId 书籍 ID
 * @returns 已下载的页面数量
 */
export function getDownloadedPageCount(bookId: number): number {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return 0;
    }

    const stmt = db.prepare('SELECT COUNT(*) as count FROM book_page WHERE book_id = ? AND status = 1');
    stmt.bind([bookId]);

    let count = 0;
    if (stmt.step()) {
        const row = stmt.getAsObject();
        count = row.count as number;
    }

    stmt.free();
    return count;
}

/**
 * 获取未下载的页面数量
 * 
 * @param bookId 书籍 ID
 * @returns 未下载的页面数量
 */
export function getUndownloadedPageCount(bookId: number): number {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return 0;
    }

    const stmt = db.prepare('SELECT COUNT(*) as count FROM book_page WHERE book_id = ? AND status = 0');
    stmt.bind([bookId]);

    let count = 0;
    if (stmt.step()) {
        const row = stmt.getAsObject();
        count = row.count as number;
    }

    stmt.free();
    return count;
}

/**
 * 获取未下载页面的起始索引
 * 
 * @param bookId 书籍 ID
 * @returns 未下载页面的起始索引，如果没有则返回 -1
 */
export function getFirstUndownloadedPageIdx(bookId: number): number {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return -1;
    }

    const stmt = db.prepare('SELECT MIN(page_idx) as page_idx FROM book_page WHERE book_id = ? AND status = 0');
    stmt.bind([bookId]);

    let pageIdx = -1;
    if (stmt.step()) {
        const row = stmt.getAsObject();
        pageIdx = (row.page_idx as number) || -1;
    }

    stmt.free();
    return pageIdx;
}


/**
 * 分页查询书籍列表
 * 
 * @param page 当前页码（从 1 开始）
 * @param pageSize 每页数量
 * @returns 书籍列表和总数
 */
export function getBooksByPage(page: number, pageSize: number): { content: any[], total: number } {
    if (!db) {
        console.warn('[DB] Database not initialized');
        return { content: [], total: 0 };
    }

    // 获取总数
    let total = 0;
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM book');
    if (countStmt.step()) {
        const row = countStmt.getAsObject();
        total = row.count as number;
    }
    countStmt.free();

    // 计算偏移量
    const offset = (page - 1) * pageSize;

    // 分页查询
    const results: any[] = [];
    const stmt = db.prepare('SELECT * FROM book ORDER BY create_time DESC LIMIT ? OFFSET ?');
    stmt.bind([pageSize, offset]);

    while (stmt.step()) {
        results.push(stmt.getAsObject());
    }

    stmt.free();
    return { content: results, total };
}
