import { NextResponse } from 'next/server';
import axios from 'axios';

const API_BASE_URL = 'https://youtube-api-ten-tawny.vercel.app';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const path = searchParams.get('path') || '';
    const params = Object.fromEntries(searchParams.entries());
    delete params.path;  // 删除 path 参数，不需要传递给实际的 API

    const response = await axios.get(`${API_BASE_URL}${path}`, {
      params,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000
    });

    return NextResponse.json(response.data);
  } catch (error) {
    console.error('酷狗音乐 API 请求失败:', error);
    return NextResponse.json(
      { error: '请求失败', message: error.message },
      { status: error.response?.status || 500 }
    );
  }
} 