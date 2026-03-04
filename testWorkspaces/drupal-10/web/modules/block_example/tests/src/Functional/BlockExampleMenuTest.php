<?php

namespace Drupal\Tests\block_example\Functional;

use Drupal\Tests\BrowserTestBase;

/**
 * Test the user-facing menus in Block Example.
 *
 * @ingroup block_example
 *
 * @group block_example
 * @group examples
 */
class BlockExampleMenuTest extends BrowserTestBase {

  /**
   * {@inheritdoc}
   */
  protected $defaultTheme = 'stark';

  /**
   * Modules to enable.
   *
   * @var array
   */
  protected static $modules = ['block', 'block_example'];

  /**
   * The installation profile to use with this test.
   *
   * This test class requires the "Tools" block.
   *
   * @var string
   */
  protected $profile = 'minimal';

  /**
   * Test for a link to the block example in the Tools menu.
   */
  public function testBlockExampleLink() {
    $this->drupalGet('');
    $this->assertSession()->linkByHrefExists('examples/block-example');

    $this->drupalGet('examples/block-example');
    $this->assertSession()->statusCodeEquals(200);

    // Verify that the block admin page link works.
    $this->clickLink('the block admin page');
    // Since it links to the admin page, we should get a permissions error and
    // not 404.
    $this->assertSession()->statusCodeEquals(403);
  }

}
