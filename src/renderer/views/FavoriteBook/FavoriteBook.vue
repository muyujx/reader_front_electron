<template>


    <div class="favorite">

        <div class="empty-notify"
             :class="{
                'active': empty
            }"
        >
            <el-icon>
                <MostlyCloudy/>
            </el-icon>
            <p>还没有收藏书籍</p>
        </div>


        <div class="books">


            <div class="book"
                 :content="book.bookName"
                 v-for="book in bookList"
                 :key="book.bookId"

            >

                <div class="cover"
                     @click="toBookPage(book)"
                >
                    <img :src="addHost(book.coverPic)" :alt="book.bookName"/>

                </div>


                <div class="detail">

                    <div class="cancel-favorite"
                         @click="cancelFavorite(book.bookId)"
                    >

                        <el-icon>
                            <StarFilled/>
                        </el-icon>

                    </div>

                    <p class="name">{{ book.bookName }}</p>

                    <div class="item">
                        <p>上次读到:</p>
                        <p>{{ book.lastRead == 0 ? 0 : book.page }}页</p>
                    </div>

                    <div class="item">
                        <p>总页数:</p>
                        <p>{{ book.totalPage }}页</p>
                    </div>

                    <div class="item">
                        <p>进度:</p>
                        <p>{{ book.lastRead == 0 ? 0 : (book.page / book.totalPage * 100).toFixed(2) }}%</p>
                    </div>

                    <div class="item">
                        <p>阅读时间:</p>
                        <p>{{ Math.floor(book.readingCost / 60) }} 分钟</p>
                    </div>

                    <div class="item">
                        <p>上次阅读:</p>
                        <p>{{
                                book.lastRead == 0 ? '未阅读' : getLastRead(book.lastRead)
                            }}</p>
                    </div>


                </div>

            </div>

        </div>


        <el-pagination
            v-model:page-size="pageSize"
            layout="prev, pager, next, jumper"
            :page-count="totalPage"
            @current-change="jumpToPage"
            hide-on-single-page
        />

    </div>


</template>

<style scoped lang="less" src="./FavoriteBook.less"/>

<script setup lang="ts">
import {addHost} from "../../apis/request.ts";
import {ref} from "vue";
import {useRouter} from "vue-router";
import {BookTag} from "../../model/bookTag.ts";
import {getAllTag} from "../../apis/bookTag.ts";
import {delFavoriteApi, getFavoriteBookListAPi} from "../../apis/favoriteBook.ts";
import {FavoriteBookInfo, FavoriteBookList} from "../../model/favoriteBook.ts";
import moment from "moment";
import {MostlyCloudy, StarFilled} from "@element-plus/icons-vue";
import {popErr, popSuccess} from "../../utils/message.ts";

const bookList = ref(new Array<FavoriteBookInfo>());
const page = ref(1);
const pageSize = ref(12);
const totalPage = ref(1);
const router = useRouter();
const tagMap = new Map<number, BookTag>;
const tags = ref<BookTag[]>([]);
const empty = ref(false);


function getBookList() {
    getFavoriteBookListAPi(page.value, pageSize.value, '', -1)
        .then((bookInfoList: FavoriteBookList) => {

            empty.value = (bookInfoList.totalPage == 0);

            totalPage.value = bookInfoList.totalPage;
            bookList.value = bookInfoList.content;
        });
}


function toBookPage(book: FavoriteBookInfo) {

    setTimeout(() => {

        router.push({
            name: "Read",
            query: {
                "bookId": book.bookId,
                "remotePage": book.page
            }
        }).then();

        // 动画时间
    }, 200)
}

function jumpToPage(pageIdx: number) {

    console.log(`pageIdx = ${pageIdx}, totalPage = ${totalPage.value}, page = ${page.value}`);

    if (pageIdx < 1 || (totalPage.value != 0 && pageIdx > totalPage.value) || page.value == pageIdx) {
        return;
    }
    page.value = pageIdx;
    getBookList();
}

function cancelFavorite(bookId: number) {
    delFavoriteApi(bookId)
        .then(() => {
            popSuccess("取消收藏");
        })
        .catch((() => {
            popErr("取消收藏失败")
        }))
        .finally(() => {
            getBookList();
        })
}

function getLastRead(lastReadTime: number) {
    const daysDifference = moment().diff(moment(lastReadTime), 'days');

    switch (daysDifference) {
        case 0:
            return "今天";
        case 1:
            return "昨天";
        default:
            return daysDifference + "天前";
    }
}

function refresh() {
    // 获取书籍标签
    getAllTag().then(res => {
        for (let tag of res) {
            tagMap.set(tag.id, tag);
        }
        tags.value = res;
    });

    getBookList();
}

defineExpose({
    'refresh': refresh
})

</script>


