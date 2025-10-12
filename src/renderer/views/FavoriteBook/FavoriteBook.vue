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
            <p>阅读进度:</p>

            <div class="detail_item_content">
              <p>{{ book.lastRead == 0 ? 0 : book.page }} / {{ book.totalPage }} 页</p>

              <el-progress
                  :text-inside="true"
                  :stroke-width="15"
                  :format="num => `${num == 0 ? '0' : num.toFixed(2)}%`"
                  :percentage="book.lastRead == 0 ? 0 : (book.page / book.totalPage * 100)"
              />

            </div>

          </div>

          <div class="item">
            <p>阅读时间:</p>
            <p>{{ readCost(book.readingCost) }}</p>
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
        v-model:current-page="page"
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
import {onUnmounted, ref} from "vue";
import {useRouter} from "vue-router";
import {BookTag} from "../../model/bookTag.ts";
import {getAllTag} from "../../apis/bookTag.ts";
import {delFavoriteApi, getFavoriteBookListAPi} from "../../apis/favoriteBook.ts";
import {FavoriteBookInfo, FavoriteBookList} from "../../model/favoriteBook.ts";
import moment from "moment";
import {MostlyCloudy, StarFilled} from "@element-plus/icons-vue";
import {popErr, popSuccess} from "../../utils/message.ts";
import {loadingStore} from "../../store/loading.ts";
import hotkeys from "hotkeys-js";
import windowSizeListener from "../../service/windowSize.ts";

const bookList = ref(new Array<FavoriteBookInfo>());
const page = ref(1);
const pageSize = ref(12);
const totalPage = ref(1);
const router = useRouter();
const tagMap = new Map<number, BookTag>;
const tags = ref<BookTag[]>([]);
const empty = ref(false);
const loading = loadingStore();

// 监听窗口大小变化，修改 pageSize
const onWindowSizeChange = (width, height) => {


  let curPageSize = 12;
  if (height < 500) {
    curPageSize = 4;
  } else if (height <= 900) {
    curPageSize = 9;
  }
  if (pageSize.value != curPageSize) {
    pageSize.value = curPageSize;
    getBookList();
  }
};
windowSizeListener.on(onWindowSizeChange);
onUnmounted(() => {
  console.log("----- FavoriteBook Unmounted ---");
  windowSizeListener.delete(onWindowSizeChange);
})

function getBookList() {

  loading.show();

  getFavoriteBookListAPi(page.value, pageSize.value)
      .then((bookInfoList: FavoriteBookList) => {

        empty.value = (bookInfoList.totalPage == 0);

        totalPage.value = bookInfoList.totalPage;
        bookList.value = bookInfoList.content;
      })
      .finally(() => {
        loading.hide();
      });
}


function toBookPage(book: FavoriteBookInfo) {

  setTimeout(() => {

    router.push({
      name: "Read",
      query: {
        "bookId": book.bookId,
        "remotePage": book.page,
        "favorite": "true",
      }
    }).then();

    // 动画时间
  }, 200)
}

function jumpToPage(pageIdx: number) {

  console.log(`pageIdx = ${pageIdx}, totalPage = ${totalPage.value}, page = ${page.value}`);

  if (pageIdx < 1 || (totalPage.value != 0 && pageIdx > totalPage.value)) {
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

function readCost(minutes: number): string {
  minutes = Math.floor(minutes / 60);
  if (minutes < 60) {
    return `${minutes} 分钟`
  }
  let hour = Math.floor(minutes / 60);
  let minute = Math.floor(minutes % 60);
  if (minute == 0) {
    return `${hour} 小时`
  }
  return `${hour} 小时 ${minute} 分钟`;
}

function enter() {
  console.log("--- FavoriteBook Page Enter ----");

  hotkeys('left, a, s, page up', 'favorite', () => jumpToPage(page.value - 1));
  hotkeys('right, f, d, page down', 'favorite', () => jumpToPage(page.value + 1));
  hotkeys.setScope('favorite');

  // 获取书籍标签
  getAllTag().then(res => {
    for (let tag of res) {
      tagMap.set(tag.id, tag);
    }
    tags.value = res;
  });

  getBookList();
}

function leave() {
  console.log("--- FavoriteBook Page Leave ----");
  hotkeys.deleteScope('favorite');
}

defineExpose({
  'enter': enter,
  'leave': leave,
})

</script>


