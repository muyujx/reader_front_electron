import {createApp} from 'vue';
import App from './App.vue';
import router from './route';
import 'animate.css';
import {createPinia} from "pinia";
import 'element-plus/dist/index.css';
import {setUserStore} from "./store/userStore.ts";
import {checkLoginApi} from "./apis/login.ts";


const app = createApp(App);
app.use(createPinia());
app.use(router);

/**
 * 检查当前登录状态
 */
function checkLogin() {

    checkLoginApi().then(res => {
        setUserStore(res);
    }).finally(() => {
        app.mount('#app');
    })

}

checkLogin();
