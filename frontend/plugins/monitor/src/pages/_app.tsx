import type { AppProps } from 'next/app';
import { Router, useRouter } from 'next/router';
import NProgress from 'nprogress';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useGlobalStore } from '@/store/global';
import { useLoading } from '@/hooks/useLoading';
import { useEffect } from 'react';
import { useConfirm } from '@/hooks/useConfirm';
import { throttle } from 'lodash';
import { sealosApp, createSealosApp } from 'sealos-desktop-sdk/app';
import { SEALOS_DOMAIN, loadInitData } from '@/store/static';
import Head from 'next/head';

import 'nprogress/nprogress.css';
import '@ant-design/flowchart/dist/index.css';
import '@/styles/globals.css';

//Binding events.
Router.events.on('routeChangeStart', () => NProgress.start());
Router.events.on('routeChangeComplete', () => NProgress.done());
Router.events.on('routeChangeError', () => NProgress.done());

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: false,
      cacheTime: 0
    }
  }
});

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { setScreenWidth, loading, setLastRoute } = useGlobalStore();
  const { Loading } = useLoading();
  const { openConfirm, ConfirmChild } = useConfirm({
    title: '跳转提示',
    content: '该应用不允许单独使用，点击确认前往 Sealos Desktop 使用。'
  });

  useEffect(() => {
    NProgress.start();
    const response = createSealosApp();

    (async () => {
      try {
        const res = await sealosApp.getSession();
        localStorage.setItem('session', JSON.stringify(res));
        console.log('app init success');
      } catch (err) {
        console.log('App is not running in desktop');
        if (!process.env.NEXT_PUBLIC_MOCK_USER) {
          localStorage.removeItem('session');
          openConfirm(() => {
            window.open(`https://${SEALOS_DOMAIN}`, '_self');
          })();
        }
      }
    })();
    NProgress.done();

    return response;
  }, [openConfirm]);

  // add resize event
  useEffect(() => {
    const resize = throttle((e: Event) => {
      const documentWidth = document.documentElement.clientWidth || document.body.clientWidth;
      setScreenWidth(documentWidth);
    }, 200);
    window.addEventListener('resize', resize);
    const documentWidth = document.documentElement.clientWidth || document.body.clientWidth;
    setScreenWidth(documentWidth);

    return () => {
      window.removeEventListener('resize', resize);
    };
  }, [setScreenWidth]);

  // init
  useEffect(() => {
    loadInitData();
  }, []);

  // record route
  useEffect(() => {
    return () => {
      setLastRoute(router.asPath);
    };
  }, [router.asPath, router.pathname, setLastRoute]);

  return (
    <>
      <Head>
        <title>Sealos Monitor Plugin</title>
        <meta name="description" content="Generated by Sealos Team" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <QueryClientProvider client={queryClient}>
        <Component {...pageProps} />
        <ConfirmChild />
        <Loading loading={loading} />
      </QueryClientProvider>
    </>
  );
}