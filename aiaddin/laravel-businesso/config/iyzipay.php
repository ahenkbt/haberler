<?php

namespace Config;

class Iyzipay
{
  public static function options($apiKey = null, $secretKey = null, $baseUrl = null)
  {
    $options = new \Iyzipay\Options();
    $options->setApiKey($apiKey ?: config('iyzipay.api_key'));
    $options->setSecretKey($secretKey ?: config('iyzipay.secret_key'));
    $options->setBaseUrl($baseUrl ?: config('iyzipay.base_url'));
    return $options;
  }
}
