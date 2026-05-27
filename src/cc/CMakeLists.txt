cmake_minimum_required(VERSION 3.15)
project(reader-addon)

# 设置 C++ 标准
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# node-addon-api 路径
set(NODE_ADDON_API_DIR "${CMAKE_SOURCE_DIR}/../../node_modules/node-addon-api")

# 包含头文件
include_directories(${CMAKE_JS_INC})
include_directories(${NODE_ADDON_API_DIR})

# 添加源文件
add_library(${PROJECT_NAME} SHARED src/addon.cpp ${CMAKE_JS_SRC})

# 设置输出名称（去掉 lib 前缀）
set_target_properties(${PROJECT_NAME} PROPERTIES PREFIX "" SUFFIX ".node")

# 链接 CMake.js 提供的库
target_link_libraries(${PROJECT_NAME} ${CMAKE_JS_LIB})

# Windows 特殊配置
if(WIN32)
    target_compile_definitions(${PROJECT_NAME} PRIVATE _HAS_EXCEPTIONS=1)
endif()
