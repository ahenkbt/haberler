<?php

namespace App\Models\User;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class FooterText extends Model
{
    use HasFactory;

    protected $table = "user_footer_texts";

    protected $fillable = [
        'language_id',
        'user_id',
        'logo',
        'bg_image',
        'about_company',
        'newsletter_text',
        'copyright_text',
        'footer_color'
    ];

    public function footerTextLang()
    {
        return $this->belongsTo(Language::class, 'language_id');
    }
}
