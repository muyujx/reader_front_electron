#include <napi.h>

/**
 * 获取 C++ 对象
 * 返回一个包含 name、value、success 字段的对象
 */
Napi::Object GetCppObject(const Napi::CallbackInfo& info) {
    Napi::Env env = info.Env();
    
    // 创建返回对象
    Napi::Object result = Napi::Object::New(env);
    
    // 设置属性
    result.Set("name", Napi::String::New(env, "cpp-addon"));
    result.Set("value", Napi::Number::New(env, 42));
    result.Set("success", Napi::Boolean::New(env, true));
    
    return result;
}

/**
 * 初始化模块，导出方法
 */
Napi::Object Init(Napi::Env env, Napi::Object exports) {
    exports.Set("getCppObject",
                Napi::Function::New(env, GetCppObject));
    return exports;
}

NODE_API_MODULE(reader-addon, Init)
