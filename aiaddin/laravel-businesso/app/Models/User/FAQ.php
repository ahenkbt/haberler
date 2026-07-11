<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FAQ extends Model
{
    use HasFactory;

    protected $table = 'user_faqs';

    protected $fillable = [
        'user_id',
        'language_id',
        'question',
        'answer',
        'featured',
        'serial_number'
    ];

    public function faqLang()
    {
        return $this->belongsTo(Language::class);
    }
}
