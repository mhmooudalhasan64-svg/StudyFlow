cmake_minimum_required(VERSION 3.22.1)
project(vayora_whisper LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_TESTS OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
set(WHISPER_BUILD_SERVER OFF CACHE BOOL "" FORCE)
set(WHISPER_FFMPEG OFF CACHE BOOL "" FORCE)
set(WHISPER_SDL2 OFF CACHE BOOL "" FORCE)
set(WHISPER_CURL OFF CACHE BOOL "" FORCE)
set(GGML_OPENMP OFF CACHE BOOL "" FORCE)
set(GGML_NATIVE OFF CACHE BOOL "" FORCE)

include(FetchContent)
FetchContent_Declare(
    whisper_cpp
    GIT_REPOSITORY https://github.com/ggml-org/whisper.cpp.git
    GIT_TAG 6a8addd258eadd6563f8c582e8acc535e6325364
    GIT_SHALLOW FALSE
)
FetchContent_MakeAvailable(whisper_cpp)

add_library(vayora_whisper SHARED whisper_jni.cpp)
target_include_directories(vayora_whisper PRIVATE
    ${whisper_cpp_SOURCE_DIR}/include
    ${whisper_cpp_SOURCE_DIR}/ggml/include
)
find_library(android-log log)
target_link_libraries(vayora_whisper PRIVATE whisper android ${android-log})
