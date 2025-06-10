<template>

    <div class="clock">
        {{ timeStr }}
    </div>

</template>


<script setup lang="ts">

import {ref} from "vue";
import moment from "moment";


const timeStr = ref(getTime());

function getTime(): string {
    return moment().format("HH:mm");
}

setInterval(() => {
    timeStr.value = getTime();
}, 5000);


</script>

<style scoped lang="less">

.clock {
    color: var(--text);
    width: 200px;
    font-size: 16px;
    user-select: none;
    position: absolute;
    bottom: 0;
}

</style>