<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserOfferBanner extends Model
{
    use HasFactory;
    public $table = 'user_offer_banners'; 

    protected $fillable = [
        'user_id',
        'language_id',
        'position',
        'url',
        'image',
        'btn_name',
        'text_1',
        'text_2',
        'text_3',
    ];
}
